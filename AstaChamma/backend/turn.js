/* ============================================================
   ASTACHAMMA — TURN CONTROLLER
   ============================================================

   File:
       AstaChamma/app/turn.js

   RESPONSIBILITY
   --------------
   turn.js owns temporary turn state and turn mechanics.

   It manages:

       - turn phase
       - roll records
       - roll selection
       - piece selection
       - split 8 → 4 + 4
       - bonus-roll bookkeeping
       - illegal-action bookkeeping
       - turn totals
       - consecutive 8 tracking
       - turn snapshots
       - turn reset/finalization

   It does NOT own:

       - player/piece persistent state
       - board routes
       - movement rules
       - capture legality
       - DOM/UI

   Those belong to:

       state.js
       gameplay.js
       rules.js
       core.js

   ============================================================ */

(function () {

    "use strict";


    /* ========================================================
       1. DEPENDENCIES
       ======================================================== */

    const State =
        window.AstaChammaState;

    const Coins =
        window.AstaChammaCoins;


    if (
        !State ||
        !Coins
    ) {

        console.error(
            "AstaChamma Turn: required modules are missing."
        );

        return;

    }


    /* ========================================================
       2. CONSTANTS
       ======================================================== */

    const PHASE =
        Object.freeze({

            ROLL:
                "ROLL",

            MOVE:
                "MOVE",

            SPLIT:
                "SPLIT",

            GAME_OVER:
                "GAME_OVER"

        });


    const MAX_TURN_TOTAL =
        32;


    /* ========================================================
       3. INTERNAL TURN STATE
       ======================================================== */

    let turnState = {

        phase:
            PHASE.ROLL,

        rolls:
            [],

        selectedRollIndex:
            null,

        selectedPieceId:
            null,

        splitMode:
            false,

        pendingSplit:
            null,

        turnTotal:
            0,

        illegalCount:
            0,

        capturesThisTurn:
            0,

        coreReachedThisTurn:
            0,

        bonusRolls:
            0,

        consecutiveEights:
            0,

        cancelled:
            false

    };


    /* ========================================================
       4. UTILITIES
       ======================================================== */

    function clone(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return value;

        }


        return JSON.parse(
            JSON.stringify(
                value
            )
        );

    }


    function getGameState() {

        return State.getGameState();

    }


    function syncPublicState() {

        const state =
            getGameState();


        /*
         * Keep the public state synchronized with the turn
         * controller where those fields exist.
         */
        state.phase =
            turnState.phase;

        state.turnTotal =
            turnState.turnTotal;

        state.illegalCount =
            turnState.illegalCount;

        state.capturesThisTurn =
            turnState.capturesThisTurn;

        state.coreReachedThisTurn =
            turnState.coreReachedThisTurn;

        state.bonusRolls =
            turnState.bonusRolls;

        state.consecutiveEights =
            turnState.consecutiveEights;

        state.cancelled =
            turnState.cancelled;

        state.selectedRollIndex =
            turnState.selectedRollIndex;

        state.selectedPieceId =
            turnState.selectedPieceId;

        state.splitMode =
            turnState.splitMode;

        state.pendingSplit =
            clone(
                turnState.pendingSplit
            );

    }


    /* ========================================================
       5. TURN RESET
       ======================================================== */

    function resetTurnState() {

        turnState = {

            phase:
                PHASE.ROLL,

            rolls:
                [],

            selectedRollIndex:
                null,

            selectedPieceId:
                null,

            splitMode:
                false,

            pendingSplit:
                null,

            turnTotal:
                0,

            illegalCount:
                0,

            capturesThisTurn:
                0,

            coreReachedThisTurn:
                0,

            bonusRolls:
                0,

            consecutiveEights:
                0,

            cancelled:
                false

        };


        syncPublicState();


        return true;

    }


    /* ========================================================
       6. TURN STATE QUERY
       ======================================================== */

    function getTurnState() {

        return clone(
            turnState
        );

    }


    function getPhase() {

        return turnState.phase;

    }


    function setPhase(
        phase
    ) {

        if (
            !Object.values(
                PHASE
            ).includes(
                phase
            )
        ) {

            return {

                success:
                    false,

                reason:
                    "Invalid turn phase."

            };

        }


        turnState.phase =
            phase;


        syncPublicState();


        return {

            success:
                true,

            phase

        };

    }


    /* ========================================================
       7. ROLL RECORD
       ======================================================== */

    function createRollRecord(
        value,
        rawValue,
        coins
    ) {

        return {

            value:
                value,

            rawValue:
                rawValue,

            coins:
                Array.isArray(
                    coins
                )
                    ? [
                        ...coins
                    ]
                    : [],

            used:
                false,

            index:
                turnState.rolls.length

        };

    }


    function addRoll(
        value,
        rawValue = null,
        coins = []
    ) {

        if (
            !Number.isInteger(
                value
            )
        ) {

            return {

                success:
                    false,

                reason:
                    "Roll value must be an integer."

            };

        }


        if (
            value < 1 ||
            value > 8
        ) {

            return {

                success:
                    false,

                reason:
                    "Roll value must be between 1 and 8."

            };

        }


        /*
         * The established rule limits accumulated roll value
         * to 32.
         */
        if (
            turnState.turnTotal +
            value >
            MAX_TURN_TOTAL
        ) {

            return {

                success:
                    false,

                reason:
                    "Turn total cannot exceed 32."

            };

        }


        const roll =
            createRollRecord(
                value,
                rawValue,
                coins
            );


        turnState.rolls.push(
            roll
        );


        turnState.turnTotal +=
            value;


        if (
            value === 8
        ) {

            turnState.consecutiveEights++;

        } else {

            turnState.consecutiveEights =
                0;

        }


        /*
         * A three-8 sequence is tracked here. The final
         * cancellation rule is applied by cancelTurn().
         */
        turnState.phase =
            PHASE.MOVE;


        syncPublicState();


        return {

            success:
                true,

            roll:
                clone(
                    roll
                ),

            index:
                roll.index,

            total:
                turnState.turnTotal

        };

    }


    function getRoll(
        rollIndex
    ) {

        if (
            !Number.isInteger(
                rollIndex
            )
        ) {

            return null;

        }


        return (
            turnState.rolls[
                rollIndex
            ]
            || null
        );

    }


    function getRolls() {

        return clone(
            turnState.rolls
        );

    }


    /* ========================================================
       8. ROLL USAGE
       ======================================================== */

    function markRollUsed(
        rollIndex
    ) {

        const roll =
            getRoll(
                rollIndex
            );


        if (
            !roll
        ) {

            return {

                success:
                    false,

                reason:
                    "Invalid roll index."

            };

        }


        if (
            roll.used
        ) {

            return {

                success:
                    false,

                reason:
                    "Roll has already been used."

            };

        }


        roll.used =
            true;


        syncPublicState();


        return {

            success:
                true,

            roll:
                clone(
                    roll
                )

        };

    }


    function markRollUnused(
        rollIndex
    ) {

        const roll =
            getRoll(
                rollIndex
            );


        if (
            !roll
        ) {

            return false;

        }


        if (
            !roll.used
        ) {

            return true;

        }


        roll.used =
            false;


        syncPublicState();


        return true;

    }


    function hasUnusedRoll() {

        return turnState.rolls.some(
            roll =>
                !roll.used
        );

    }


    function hasUnusedEight() {

        return turnState.rolls.some(
            roll =>
                !roll.used &&
                roll.value === 8
        );

    }


    function remainingUnusedRolls() {

        return turnState.rolls.filter(
            roll =>
                !roll.used
        );

    }


    function getRemainingRollValues() {

        return remainingUnusedRolls().map(
            roll =>
                roll.value
        );

    }


    /* ========================================================
       9. SELECTION
       ======================================================== */

    function selectRoll(
        rollIndex
    ) {

        const roll =
            getRoll(
                rollIndex
            );


        if (
            !roll
        ) {

            return {

                success:
                    false,

                reason:
                    "Invalid roll."

            };

        }


        if (
            roll.used
        ) {

            return {

                success:
                    false,

                reason:
                    "Roll already used."

            };

        }


        turnState.selectedRollIndex =
            rollIndex;


        /*
         * Selecting a roll normally means the player is moving.
         * Split mode is handled separately.
         */
        if (
            !turnState.splitMode
        ) {

            turnState.phase =
                PHASE.MOVE;

        }


        syncPublicState();


        return {

            success:
                true,

            rollIndex,

            roll:
                clone(
                    roll
                )

        };

    }


    function selectPiece(
        pieceId
    ) {

        if (
            pieceId === null ||
            pieceId === undefined
        ) {

            return {

                success:
                    false,

                reason:
                    "Piece ID is required."

            };

        }


        turnState.selectedPieceId =
            pieceId;


        syncPublicState();


        return {

            success:
                true,

            pieceId

        };

    }


    function clearSelection() {

        turnState.selectedRollIndex =
            null;

        turnState.selectedPieceId =
            null;


        syncPublicState();


        return true;

    }


    /* ========================================================
       10. ILLEGAL ACTIONS
       ======================================================== */

    function registerIllegalAction() {

        turnState.illegalCount++;


        syncPublicState();


        return turnState.illegalCount;

    }


    function getIllegalCount() {

        return turnState.illegalCount;

    }


    /* ========================================================
       11. CAPTURE / CORE BONUS BOOKKEEPING
       ======================================================== */

    function registerCapture() {

        turnState.capturesThisTurn++;


        turnState.bonusRolls++;


        syncPublicState();


        return {

            success:
                true,

            capturesThisTurn:
                turnState.capturesThisTurn,

            bonusRolls:
                turnState.bonusRolls

        };

    }


    function registerCoreReached() {

        turnState.coreReachedThisTurn++;


        turnState.bonusRolls++;


        syncPublicState();


        return {

            success:
                true,

            coreReachedThisTurn:
                turnState.coreReachedThisTurn,

            bonusRolls:
                turnState.bonusRolls

        };

    }


    function addBonusRoll(
        reason = "bonus"
    ) {

        turnState.bonusRolls++;


        syncPublicState();


        return {

            success:
                true,

            reason,

            bonusRolls:
                turnState.bonusRolls

        };

    }


    function hasBonusRoll() {

        return (
            turnState.bonusRolls >
            0
        );

    }


    /* ========================================================
       12. BONUS ROLL PREPARATION
       ======================================================== */

    function prepareNextRoll() {

        if (
            turnState.bonusRolls <=
            0
        ) {

            return {

                success:
                    false,

                reason:
                    "No bonus roll is available."

            };

        }


        /*
         * Consume one bonus entitlement only when the bonus
         * roll actually starts.
         */
        turnState.bonusRolls--;


        turnState.rolls =
            [];


        turnState.turnTotal =
            0;


        turnState.selectedRollIndex =
            null;


        turnState.selectedPieceId =
            null;


        turnState.splitMode =
            false;


        turnState.pendingSplit =
            null;


        turnState.cancelled =
            false;


        turnState.consecutiveEights =
            0;


        turnState.phase =
            PHASE.ROLL;


        syncPublicState();


        return {

            success:
                true,

            phase:
                PHASE.ROLL,

            bonusRoll:
                true

        };

    }


    /* ========================================================
       13. SPLIT 8 → 4 + 4
       ======================================================== */

    function splitEight(
        rollIndex
    ) {

        const roll =
            getRoll(
                rollIndex
            );


        if (
            !roll
        ) {

            return {

                success:
                    false,

                reason:
                    "Invalid roll."

            };

        }


        if (
            roll.used
        ) {

            return {

                success:
                    false,

                reason:
                    "Roll already used."

            };

        }


        if (
            roll.value !== 8
        ) {

            return {

                success:
                    false,

                reason:
                    "Only an 8 can be split."

            };

        }


        if (
            turnState.splitMode
        ) {

            return {

                success:
                    false,

                reason:
                    "A split is already active."

            };

        }


        turnState.splitMode =
            true;


        turnState.phase =
            PHASE.SPLIT;


        turnState.selectedRollIndex =
            rollIndex;


        turnState.pendingSplit = {

            rollIndex,

            originalValue:
                8,

            chunks: [

                {

                    index:
                        0,

                    value:
                        4,

                    used:
                        false,

                    pieceId:
                        null

                },

                {

                    index:
                        1,

                    value:
                        4,

                    used:
                        false,

                    pieceId:
                        null

                }

            ]

        };


        syncPublicState();


        return {

            success:
                true,

            rollIndex,

            chunks:
                [
                    4,
                    4
                ],

            pendingSplit:
                clone(
                    turnState.pendingSplit
                )

        };

    }


    function getPendingSplit() {

        return clone(
            turnState.pendingSplit
        );

    }


    function assignSplitChunk(
        chunkIndex,
        pieceId
    ) {

        if (
            !turnState.splitMode ||
            !turnState.pendingSplit
        ) {

            return {

                success:
                    false,

                reason:
                    "No active split."

            };

        }


        if (
            !Number.isInteger(
                chunkIndex
            ) ||
            chunkIndex < 0 ||
            chunkIndex > 1
        ) {

            return {

                success:
                    false,

                reason:
                    "Invalid split chunk."

            };

        }


        const chunk =
            turnState.pendingSplit.chunks[
                chunkIndex
            ];


        if (
            chunk.used
        ) {

            return {

                success:
                    false,

                reason:
                    "Split chunk already used."

            };

        }


        /*
         * The same piece may not consume both halves of the
         * split unless the caller explicitly permits it.
         *
         * The current game design treats the two 4s as two
         * separately assignable actions.
         */
        const otherChunk =
            turnState.pendingSplit.chunks.find(
                candidate =>
                    candidate.index !==
                    chunkIndex
            );


        if (
            otherChunk &&
            otherChunk.pieceId ===
            pieceId
        ) {

            return {

                success:
                    false,

                reason:
                    "The same piece cannot consume both split chunks."

            };

        }


        chunk.pieceId =
            pieceId;


        syncPublicState();


        return {

            success:
                true,

            chunkIndex,

            pieceId

        };

    }


    function markSplitChunkUsed(
        chunkIndex
    ) {

        if (
            !turnState.pendingSplit
        ) {

            return {

                success:
                    false,

                reason:
                    "No active split."

            };

        }


        const chunk =
            turnState.pendingSplit.chunks[
                chunkIndex
            ];


        if (
            !chunk
        ) {

            return {

                success:
                    false,

                reason:
                    "Invalid split chunk."

            };

        }


        if (
            chunk.used
        ) {

            return {

                success:
                    false,

                reason:
                    "Split chunk already used."

            };

        }


        chunk.used =
            true;


        syncPublicState();


        return {

            success:
                true,

            chunkIndex

        };

    }


    function finalizeSplit() {

        if (
            !turnState.splitMode ||
            !turnState.pendingSplit
        ) {

            return {

                success:
                    false,

                reason:
                    "No active split."

            };

        }


        const allUsed =
            turnState.pendingSplit.chunks.every(
                chunk =>
                    chunk.used
            );


        if (
            !allUsed
        ) {

            return {

                success:
                    false,

                reason:
                    "Both split chunks must be used before finalizing."

            };

        }


        const originalRollIndex =
            turnState.pendingSplit.rollIndex;


        const originalRoll =
            getRoll(
                originalRollIndex
            );


        if (
            originalRoll
        ) {

            originalRoll.used =
                true;

        }


        turnState.splitMode =
            false;


        turnState.pendingSplit =
            null;


        turnState.selectedRollIndex =
            null;


        turnState.selectedPieceId =
            null;


        turnState.phase =
            PHASE.MOVE;


        syncPublicState();


        return {

            success:
                true,

            rollIndex:
                originalRollIndex,

            split:
                [
                    4,
                    4
                ],

            phase:
                turnState.phase

        };

    }


    /* ========================================================
       14. CANCEL TURN
       ======================================================== */

    function cancelTurn(
        reason =
            "Turn cancelled."
    ) {

        turnState.cancelled =
            true;


        turnState.phase =
            PHASE.ROLL;


        turnState.rolls =
            [];


        turnState.selectedRollIndex =
            null;


        turnState.selectedPieceId =
            null;


        turnState.splitMode =
            false;


        turnState.pendingSplit =
            null;


        turnState.turnTotal =
            0;


        turnState.consecutiveEights =
            0;


        syncPublicState();


        return {

            success:
                true,

            cancelled:
                true,

            reason

        };

    }


    /* ========================================================
       15. TURN SNAPSHOT
       ======================================================== */

    function createSnapshot() {

        return {

            turn:
                clone(
                    turnState
                ),

            game:
                clone(
                    getGameState()
                )

        };

    }


    function restoreSnapshot(
        snapshot
    ) {

        if (
            !snapshot ||
            !snapshot.turn
        ) {

            return {

                success:
                    false,

                reason:
                    "Invalid turn snapshot."

            };

        }


        turnState =
            clone(
                snapshot.turn
            );


        /*
         * Restore persistent game state only if a game snapshot
         * was actually supplied.
         */
        if (
            snapshot.game &&
            typeof State.replaceGameState ===
            "function"
        ) {

            State.replaceGameState(
                clone(
                    snapshot.game
                )
            );

        }


        syncPublicState();


        return {

            success:
                true

        };

    }


    /* ========================================================
       16. TURN FINISH
       ======================================================== */

    function finishTurn() {

        const result = {

            success:
                true,

            cancelled:
                turnState.cancelled,

            turnTotal:
                turnState.turnTotal,

            captures:
                turnState.capturesThisTurn,

            coreReached:
                turnState.coreReachedThisTurn,

            illegalCount:
                turnState.illegalCount,

            bonusRolls:
                turnState.bonusRolls

        };


        /*
         * If a bonus entitlement remains, the caller may start
         * the bonus roll AFTER the current action resolves.
         */
        if (
            turnState.bonusRolls >
            0
        ) {

            result.bonusRollAvailable =
                true;

            result.bonusRolls =
                turnState.bonusRolls;

            return result;

        }


        resetTurnState();


        return {

            ...result,

            turnEnded:
                true,

            phase:
                PHASE.ROLL

        };

    }


    /* ========================================================
       17. COMPLETE TURN RESET
       ======================================================== */

    function hardReset() {

        resetTurnState();


        const state =
            getGameState();


        state.hasRolled =
            false;


        state.lastRoll =
            null;


        state.lastCoins =
            [];


        state.selectedPieceId =
            null;


        state.availableMoves =
            [];


        state.splitAvailable =
            false;


        state.splitUsed =
            false;


        state.splitMoves =
            [];


        return true;

    }


    /* ========================================================
       18. PUBLIC API
       ======================================================== */

    window.AstaChammaTurn =
        Object.freeze({

            /*
             * Phase
             */
            PHASE,

            getPhase,

            setPhase,


            /*
             * State
             */
            getTurnState,

            resetTurnState,

            hardReset,


            /*
             * Rolls
             */
            createRollRecord,

            addRoll,

            getRoll,

            getRolls,

            markRollUsed,

            markRollUnused,

            hasUnusedRoll,

            hasUnusedEight,

            remainingUnusedRolls,

            getRemainingRollValues,


            /*
             * Selection
             */
            selectRoll,

            selectPiece,

            clearSelection,


            /*
             * Illegal actions
             */
            registerIllegalAction,

            getIllegalCount,


            /*
             * Bonuses
             */
            registerCapture,

            registerCoreReached,

            addBonusRoll,

            hasBonusRoll,

            prepareNextRoll,


            /*
             * Split
             */
            splitEight,

            getPendingSplit,

            assignSplitChunk,

            markSplitChunkUsed,

            finalizeSplit,


            /*
             * Cancellation
             */
            cancelTurn,


            /*
             * Snapshots
             */
            createSnapshot,

            restoreSnapshot,


            /*
             * Completion
             */
            finishTurn

        });


    /* ========================================================
       19. INITIALIZATION
       ======================================================== */

    syncPublicState();


    console.info(
        "AstaChamma Turn loaded."
    );


})();