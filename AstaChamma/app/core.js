/* ============================================================
   ASTACHAMMA — CORE GAME CONTROLLER
   ============================================================

   RESPONSIBILITY
   --------------
   core.js connects:

       state.js
          ↓
       coins.js
          ↓
       rules.js
          ↓
       gameplay.js

   It is responsible for ORCHESTRATION and STATE MUTATION.

   It does NOT own:
       - board coordinates
       - player routes
       - Gavva probability
       - individual movement rules

   Those belong to the appropriate modules.

   ============================================================ */


/* ============================================================
   1. DEPENDENCY CHECK
   ============================================================ */

(function () {

    "use strict";


    const State =
        window.AstaChammaState;

    const Coins =
        window.AstaChammaCoins;

    const Rules =
        window.AstaChammaRules;

    const Gameplay =
        window.AstaChammaGameplay;


    if (
        !State ||
        !Coins ||
        !Rules ||
        !Gameplay
    ) {

        console.error(
            "AstaChamma Core: required modules are missing."
        );

        return;

    }


    /* ========================================================
       2. CONSTANTS
       ======================================================== */

    const PLAYERS =
        Object.freeze([
            "red",
            "blue",
            "green",
            "yellow"
        ]);


    const PIECE_TYPES =
        Object.freeze({
            KNIGHT: "knight",
            KING: "king"
        });


    const STATUS =
        Object.freeze({
            NEVER_ACTIVATED: -1,
            INACTIVE: 0,
            ACTIVE: 1
        });


    const CORE =
        25;


    const SAFE_POSITIONS =
        Object.freeze([
            1,
            5,
            9,
            13,
            18,
            20,
            22,
            24
        ]);


    /*
     * A player's inner track begins at their inner-entry
     * position and continues until their before-Core position.
     *
     * The complete physical inner area is:
     *
     *     17,18,19,20,21,22,23,24
     *
     * Player-specific routes determine which of these are
     * encountered and in what order.
     */
    const INNER_POSITIONS =
        Object.freeze([
            17,
            18,
            19,
            20,
            21,
            22,
            23,
            24
        ]);


    /*
     * Maximum accumulated value during one turn.
     */
    const MAX_TURN_TOTAL = 32;


    /* ========================================================
       3. INTERNAL CONTROLLER STATE
       ======================================================== */

    let turnState = {

        phase: "ROLL",

        rolls: [],

        selectedRollIndex: null,

        selectedPieceId: null,

        splitMode: false,

        pendingSplit: null,

        turnTotal: 0,

        illegalCount: 0,

        capturesThisTurn: 0,

        coreReachedThisTurn: 0,

        bonusRolls: 0,

        consecutiveEights: 0,

        cancelled: false

    };


    /*
     * Active player count.
     *
     * The default is four.
     *
     * This is kept outside state.js for now because the current
     * state model defines the four canonical players.
     */
    let activePlayers = [
        ...PLAYERS
    ];


    /*
     * Placement order.
     *
     * Example:
     *
     *     ["green", "red", "blue"]
     *
     * means those players finished 1st, 2nd and 3rd.
     */
    let placementOrder = [];


    /* ========================================================
       4. UTILITY
       ======================================================== */

    function getState() {

        return State.getGameState();

    }


    function getCurrentPlayer() {

        return getState().currentPlayer;

    }


    function getCurrentPlayerObject() {

        return State.getPlayer(
            getCurrentPlayer()
        );

    }


    function getPiece(
        playerColor,
        pieceId
    ) {

        return State.getPiece(
            playerColor,
            pieceId
        );

    }


    function isActivePlayer(
        playerColor
    ) {

        return activePlayers.includes(
            playerColor
        );

    }


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
            JSON.stringify(value)
        );

    }


    /* ========================================================
       5. TURN STATE
       ======================================================== */

    function resetTurnState() {

        turnState = {

            phase: "ROLL",

            rolls: [],

            selectedRollIndex: null,

            selectedPieceId: null,

            splitMode: false,

            pendingSplit: null,

            turnTotal: 0,

            illegalCount: 0,

            capturesThisTurn: 0,

            coreReachedThisTurn: 0,

            bonusRolls: 0,

            consecutiveEights: 0,

            cancelled: false

        };

    }


    function getTurnState() {

        return clone(
            turnState
        );

    }


    /* ========================================================
       6. GAME INITIALIZATION
       ======================================================== */

    function startGame(
        playerCount = 4
    ) {

        if (
            !Number.isInteger(
                playerCount
            )
        ) {

            return {

                success: false,

                reason:
                    "Player count must be an integer."

            };

        }


        if (
            playerCount < 2 ||
            playerCount > 4
        ) {

            return {

                success: false,

                reason:
                    "Player count must be between 2 and 4."

            };

        }


        activePlayers =
            PLAYERS.slice(
                0,
                playerCount
            );


        placementOrder = [];


        State.resetGameState();


        State.setCurrentPlayer(
            activePlayers[0]
        );


        State.setGameStarted(
            true
        );


        const state =
            getState();


        /*
         * Mark the inactive player slots as irrelevant.
         *
         * The state module still contains all four canonical
         * players; core simply controls which ones participate.
         */
        state.activePlayers =
            [
                ...activePlayers
            ];


        state.gameOver =
            false;


        resetTurnState();


        return {

            success: true,

            playerCount,

            players:
                [
                    ...activePlayers
                ],

            currentPlayer:
                getCurrentPlayer()

        };

    }


    function newGame(
        playerCount = activePlayers.length
    ) {

        return startGame(
            playerCount
        );

    }


    /* ========================================================
       7. TURN ADVANCEMENT
       ======================================================== */

    function advanceToNextActivePlayer() {

        if (
            activePlayers.length < 2
        ) {

            return null;

        }


        const state =
            getState();


        const current =
            state.currentPlayer;


        let index =
            activePlayers.indexOf(
                current
            );


        if (
            index === -1
        ) {

            index = 0;

        }


        for (
            let attempts = 0;
            attempts < activePlayers.length;
            attempts++
        ) {

            index =
                (
                    index + 1
                )
                %
                activePlayers.length;


            const candidate =
                activePlayers[index];


            /*
             * A player who has already completed all four pieces
             * is skipped.
             */
            if (
                placementOrder.includes(
                    candidate
                )
            ) {

                continue;

            }


            State.setCurrentPlayer(
                candidate
            );


            return candidate;

        }


        return null;

    }


    function endTurn(
        reason = "normal"
    ) {

        if (
            getState().gameOver
        ) {

            return {

                success: false,

                reason:
                    "Game is already over."

            };

        }


        const previousPlayer =
            getCurrentPlayer();


        const nextPlayer =
            advanceToNextActivePlayer();


        resetTurnState();


        if (
            !nextPlayer
        ) {

            return {

                success: true,

                previousPlayer,

                nextPlayer: null,

                reason

            };

        }


        return {

            success: true,

            previousPlayer,

            nextPlayer,

            reason

        };

    }


    /* ========================================================
       8. GAVVA ROLL
       ======================================================== */

    function rollGavva() {

        const state =
            getState();


        if (
            !state.started
        ) {

            return {

                success: false,

                reason:
                    "Game has not started."

            };

        }


        if (
            state.gameOver
        ) {

            return {

                success: false,

                reason:
                    "Game is over."

            };

        }


        if (
            turnState.phase !==
            "ROLL"
        ) {

            return {

                success: false,

                reason:
                    "Move phase is active."

            };

        }


        const result =
            Coins.throwGavva();


        if (
            !result
        ) {

            return {

                success: false,

                reason:
                    "Gavva throw failed."

            };

        }


        const roll =
            result.roll;


        /*
         * Turn total protection.
         */
        if (
            turnState.turnTotal +
            roll >
            MAX_TURN_TOTAL
        ) {

            turnState.cancelled =
                true;


            return {

                success: false,

                cancelled: true,

                reason:
                    "Turn total would exceed 32."

            };

        }


        /*
         * Record roll.
         */
        turnState.rolls.push({

            value:
                roll,

            gavva:
                [
                    ...result.gavva
                ],

            openCount:
                result.openCount,

            used: false,

            split: false,

            originalValue:
                roll

        });


        turnState.turnTotal +=
            roll;


        /*
         * Store latest throw in global game state.
         */
        state.hasRolled =
            true;


        state.lastRoll =
            roll;


        state.lastCoins =
            [
                ...result.gavva
            ];


        /*
         * Eight tracking.
         */
        if (
            roll === 8
        ) {

            turnState.consecutiveEights++;

        } else {

            turnState.consecutiveEights =
                0;

        }


        /*
         * 8 is eligible for 4+4.
         */
        if (
            roll === 8
        ) {

            turnState.rolls[
                turnState.rolls.length - 1
            ].splitAvailable =
                true;

        }


        /*
         * Teen Tigada:
         *
         * 8,8,8,3
         *
         * cancels the whole turn.
         */
        if (
            turnState.rolls.length >= 4
        ) {

            const lastFour =
                turnState.rolls.slice(
                    -4
                );


            if (
                lastFour[0].value === 8 &&
                lastFour[1].value === 8 &&
                lastFour[2].value === 8 &&
                lastFour[3].value === 3
            ) {

                return cancelTurn(
                    "Teen Tigada: 8,8,8,3."
                );

            }

        }


        /*
         * An 8 grants an additional roll.
         *
         * The roll itself remains a chunk that can later be
         * assigned as 8 or split into 4+4.
         */
        if (
            roll === 8
        ) {

            turnState.bonusRolls++;

        }


        /*
         * Once the player has rolled at least once,
         * movement can be selected.
         */
        turnState.phase =
            "MOVE";


        state.splitAvailable =
            hasUnusedEight();


        return {

            success: true,

            player:
                getCurrentPlayer(),

            gavva:
                [
                    ...result.gavva
                ],

            openCount:
                result.openCount,

            roll,

            turnTotal:
                turnState.turnTotal,

            rolls:
                clone(
                    turnState.rolls
                ),

            legalPieces:
                getLegalPiecesForRoll(
                    roll
                )

        };

    }


    /* ========================================================
       9. CANCEL TURN
       ======================================================== */

    function cancelTurn(
        reason
    ) {

        const state =
            getState();


        turnState.cancelled =
            true;


        /*
         * No movement from this turn is retained.
         *
         * This function assumes the caller has not yet committed
         * the triggering action.
         */
        state.hasRolled =
            false;


        state.lastRoll =
            null;


        state.lastCoins =
            [];


        turnState.phase =
            "CANCELLED";


        return {

            success: false,

            cancelled: true,

            reason,

            player:
                getCurrentPlayer()

        };

    }


    /* ========================================================
       10. ROLL ACCESS
       ======================================================== */

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
            ||
            null
        );

    }


    function hasUnusedEight() {

        return turnState.rolls.some(
            roll =>
                roll.value === 8 &&
                !roll.used
        );

    }


    function remainingUnusedRolls() {

        return turnState.rolls.filter(
            roll =>
                !roll.used
        );

    }


    /* ========================================================
       11. SELECT ROLL
       ======================================================== */

    function selectRoll(
        rollIndex
    ) {

        const roll =
            getRoll(
                rollIndex
            );


        if (!roll) {

            return {

                success: false,

                reason:
                    "Invalid roll index."

            };

        }


        if (
            roll.used
        ) {

            return {

                success: false,

                reason:
                    "Roll has already been used."

            };

        }


        turnState.selectedRollIndex =
            rollIndex;


        turnState.splitMode =
            false;


        turnState.selectedPieceId =
            null;


        return {

            success: true,

            roll:
                clone(
                    roll
                )

        };

    }


    /* ========================================================
       12. SELECT PIECE
       ======================================================== */

    function selectPiece(
        pieceId
    ) {

        const player =
            getCurrentPlayerObject();


        if (!player) {

            return {

                success: false,

                reason:
                    "Current player does not exist."

            };

        }


        const piece =
            player.pieces.find(
                candidate =>
                    candidate.id ===
                    pieceId
            );


        if (!piece) {

            return {

                success: false,

                reason:
                    "Piece does not exist."

            };

        }


        turnState.selectedPieceId =
            pieceId;


        return {

            success: true,

            piece:
                clone(
                    piece
                )

        };

    }


    /* ========================================================
       13. INITIAL ENTRY
       ======================================================== */

    function getInitialEntryCapacity(
        roll
    ) {

        return Rules.getInitialEntryCapacity(
            roll
        );

    }


    function getInitialEntryPieces(
        playerColor
    ) {

        const player =
            State.getPlayer(
                playerColor
            );


        if (!player) {
            return [];
        }


        return player.pieces.filter(
            piece =>
                piece.status ===
                STATUS.NEVER_ACTIVATED
        );

    }


    /*
     * A 4 allows TWO pieces to initially enter.
     *
     * An 8 allows ALL pieces to initially enter.
     *
     * Entry itself consumes the corresponding roll chunk.
     *
     * For initial entry:
     *
     *     4 → two pieces may enter
     *     8 → all four may enter
     *
     * The piece starts at the player's start position.
     */
    function initialEntry(
        pieceIds,
        rollIndex
    ) {

        const state =
            getState();


        const roll =
            getRoll(
                rollIndex
            );


        if (!roll) {

            return {

                success: false,

                reason:
                    "Invalid roll."

            };

        }


        if (
            roll.used
        ) {

            return {

                success: false,

                reason:
                    "Roll already used."

            };

        }


        if (
            roll.value !== 4 &&
            roll.value !== 8
        ) {

            return {

                success: false,

                reason:
                    "Initial entry requires 4 or 8."

            };

        }


        const playerColor =
            getCurrentPlayer();


        const player =
            State.getPlayer(
                playerColor
            );


        if (!player) {

            return {

                success: false,

                reason:
                    "Current player not found."

            };

        }


        if (
            !Array.isArray(
                pieceIds
            )
        ) {

            pieceIds =
                [
                    pieceIds
                ];

        }


        const capacity =
            getInitialEntryCapacity(
                roll.value
            );


        if (
            pieceIds.length > capacity
        ) {

            return {

                success: false,

                reason:
                    `This roll allows at most ${capacity} initial entries.`

            };

        }


        if (
            pieceIds.length === 0
        ) {

            return {

                success: false,

                reason:
                    "No pieces selected."

            };

        }


        const startPosition =
            Gameplay.getStartPosition(
                playerColor
            );


        const entered = [];


        for (
            const pieceId of pieceIds
        ) {

            const piece =
                State.getPiece(
                    playerColor,
                    pieceId
                );


            if (!piece) {

                return {

                    success: false,

                    reason:
                        `Piece ${pieceId} does not exist.`

                };

            }


            if (
                piece.status !==
                STATUS.NEVER_ACTIVATED
            ) {

                return {

                    success: false,

                    reason:
                        `${pieceId} has already been activated.`

                };

            }


            /*
             * The starting position is the player's route start.
             *
             * Multiple pieces may coexist at Base/start.
             */
            State.activatePiece(
                playerColor,
                pieceId,
                startPosition
            );


            entered.push(
                pieceId
            );

        }


        /*
         * The roll is consumed once.
         */
        roll.used =
            true;


        turnState.selectedRollIndex =
            null;


        turnState.selectedPieceId =
            null;


        turnState.splitMode =
            false;


        /*
         * If an 8 was used as direct entry, the 8 still counts as
         * the special roll and its extra-roll privilege remains.
         */
        if (
            roll.value === 8
        ) {

            /*
             * bonusRolls was already granted when the 8 was thrown.
             *
             * No additional increment is made here.
             */

        }


        turnState.phase =
            "MOVE";


        state.availableMoves =
            getAllAvailableActions();


        return {

            success: true,

            action:
                "initial-entry",

            player:
                playerColor,

            entered,

            startPosition,

            roll:
                roll.value,

            remainingRolls:
                remainingUnusedRolls()

        };

    }


    /* ========================================================
       14. COMEBACK AFTER CAPTURE
       ======================================================== */

    function comeback(
        pieceId,
        rollIndex
    ) {

        const roll =
            getRoll(
                rollIndex
            );


        if (!roll) {

            return {

                success: false,

                reason:
                    "Invalid roll."

            };

        }


        if (
            roll.used
        ) {

            return {

                success: false,

                reason:
                    "Roll already used."

            };

        }


        const playerColor =
            getCurrentPlayer();


        const piece =
            getPiece(
                playerColor,
                pieceId
            );


        if (!piece) {

            return {

                success: false,

                reason:
                    "Piece does not exist."

            };

        }


        if (
            piece.status !==
            STATUS.INACTIVE
        ) {

            return {

                success: false,

                reason:
                    "Piece is not captured/inactive."

            };

        }


        if (
            !Rules.canPieceComeback(
                piece,
                roll.value
            )
        ) {

            return {

                success: false,

                reason:
                    piece.type ===
                    PIECE_TYPES.KNIGHT
                        ? "Knight comeback requires 4."
                        : "King comeback requires 8."

            };

        }


        const startPosition =
            Gameplay.getStartPosition(
                playerColor
            );


        /*
         * Re-entry after capture is always the player's start.
         */
        State.activatePiece(
            playerColor,
            pieceId,
            startPosition
        );


        roll.used =
            true;


        turnState.selectedRollIndex =
            null;


        turnState.selectedPieceId =
            null;


        stateAvailableMoves();


        return {

            success: true,

            action:
                "comeback",

            player:
                playerColor,

            pieceId,

            position:
                startPosition,

            roll:
                roll.value

        };

    }


    /* ========================================================
       15. INNER LOCK
       ======================================================== */

    function playerHasCapturePermission(
        playerColor
    ) {

        const state =
            getState();


        return Rules.canPlayerEnterCore(
            state,
            playerColor
        );

    }


    function isInnerDestinationLocked(
        playerColor,
        destination
    ) {

        if (
            !INNER_POSITIONS.includes(
                destination
            )
        ) {

            return false;

        }


        return !playerHasCapturePermission(
            playerColor
        );

    }


    /* ========================================================
       16. PHYSICAL OCCUPANCY
       ======================================================== */

    function samePhysicalSquare(
        positionA,
        positionB
    ) {

        if (
            positionA === CORE ||
            positionB === CORE
        ) {

            return false;

        }


        const a =
            Gameplay.getPhysicalCoordinate(
                positionA
            );


        const b =
            Gameplay.getPhysicalCoordinate(
                positionB
            );


        if (
            !a ||
            !b
        ) {

            return false;

        }


        return (
            a.row === b.row &&
            a.col === b.col
        );

    }


    function getPiecesOnPhysicalSquare(
        logicalPosition
    ) {

        const occupants = [];


        if (
            logicalPosition === CORE
        ) {

            return occupants;

        }


        for (
            const color of activePlayers
        ) {

            const player =
                State.getPlayer(
                    color
                );


            if (!player) {
                continue;
            }


            for (
                const piece of
                player.pieces
            ) {

                if (
                    piece.status !==
                    STATUS.ACTIVE
                ) {

                    continue;

                }


                if (
                    piece.position ===
                    CORE
                ) {

                    continue;

                }


                if (
                    samePhysicalSquare(
                        piece.position,
                        logicalPosition
                    )
                ) {

                    occupants.push({

                        player:
                            color,

                        piece

                    });

                }

            }

        }


        return occupants;

    }


    /* ========================================================
       17. SAFE POSITION
       ======================================================== */

    function isSafePosition(
        logicalPosition
    ) {

        return SAFE_POSITIONS.includes(
            logicalPosition
        );

    }


    /* ========================================================
       18. COMBAT VALIDATION
       ======================================================== */

    function findEnemyOnDestination(
        playerColor,
        piece,
        destination
    ) {

        const occupants =
            getPiecesOnPhysicalSquare(
                destination
            );


        return occupants.find(
            occupant =>
                occupant.player !==
                    playerColor
                &&
                Rules.canPieceCapture(
                    piece,
                    occupant.piece
                )
        )
        || null;

    }


    function findAnyEnemyOnDestination(
        playerColor,
        destination
    ) {

        const occupants =
            getPiecesOnPhysicalSquare(
                destination
            );


        return occupants.find(
            occupant =>
                occupant.player !==
                playerColor
        )
        || null;

    }


    /* ========================================================
       19. CAPTURE
       ======================================================== */

    function performCapture(
        attackerPlayerColor,
        defenderPlayerColor,
        defenderPieceId
    ) {

        const defender =
            State.getPiece(
                defenderPlayerColor,
                defenderPieceId
            );


        if (!defender) {

            return {

                success: false,

                reason:
                    "Defending piece not found."

            };

        }


        if (
            defender.status !==
            STATUS.ACTIVE
        ) {

            return {

                success: false,

                reason:
                    "Defending piece is not active."

            };

        }


        State.capturePiece(
            defenderPlayerColor,
            defenderPieceId
        );


        /*
         * Player-wise capture count.
         */
        State.addCapture(
            attackerPlayerColor,
            1
        );


        turnState.capturesThisTurn++;


        /*
         * Capture grants a bonus roll.
         */
        turnState.bonusRolls++;


        return {

            success: true,

            attacker:
                attackerPlayerColor,

            defender:
                defenderPlayerColor,

            pieceId:
                defenderPieceId,

            bonusRoll: true

        };

    }


    /* ========================================================
       20. MOVEMENT DISTANCE
       ======================================================== */

    function getMovementDistanceForPiece(
        piece,
        roll
    ) {

        return Rules.getMovementDistance(
            piece,
            roll
        );

    }


    /* ========================================================
       21. DESTINATION VALIDATION
       ======================================================== */

    function validateDestination(
        playerColor,
        piece,
        roll,
        destination
    ) {

        const state =
            getState();


        if (
            !piece
        ) {

            return {

                valid: false,

                reason:
                    "Piece not found."

            };

        }


        if (
            piece.status !==
            STATUS.ACTIVE
        ) {

            return {

                valid: false,

                reason:
                    "Piece is not active."

            };

        }


        if (
            !Rules.canPieceUseRoll(
                piece,
                roll
            )
        ) {

            return {

                valid: false,

                reason:
                    piece.type ===
                    PIECE_TYPES.KING
                        ? "King can only move on even rolls."
                        : "Piece cannot use this roll."

            };

        }


        if (
            !Gameplay.isValidLogicalPosition(
                destination
            )
        ) {

            return {

                valid: false,

                reason:
                    "Invalid destination."

            };

        }


        /*
         * The destination must actually lie on the player's route.
         */
        const route =
            Gameplay.getPlayerRoute(
                playerColor
            );


        const currentIndex =
            route.indexOf(
                piece.position
            );


        if (
            currentIndex === -1
        ) {

            return {

                valid: false,

                reason:
                    "Current piece position is not on player's route."

            };

        }


        const distance =
            getMovementDistanceForPiece(
                piece,
                roll
            );


        if (
            distance <= 0
        ) {

            return {

                valid: false,

                reason:
                    "Roll cannot move this piece."

            };

        }


        const expectedDestination =
            Gameplay.getDestination(
                playerColor,
                piece.position,
                distance
            );


        if (
            expectedDestination === null
        ) {

            return {

                valid: false,

                reason:
                    "Move overshoots the route/Core."

            };

        }


        if (
            expectedDestination !==
            destination
        ) {

            return {

                valid: false,

                reason:
                    "Destination does not match the movement distance."

            };

        }


        /*
         * Core requirement.
         */
        if (
            destination === CORE
        ) {

            if (
                !Rules.canPlayerEnterCore(
                    state,
                    playerColor
                )
            ) {

                return {

                    valid: false,

                    reason:
                        "Core entry requires at least one capture, unless all opponents are already in Core."

                };

            }


            return {

                valid: true,

                distance,

                destination

            };

        }


        /*
         * Inner lock.
         */
        if (
            isInnerDestinationLocked(
                playerColor,
                destination
            )
        ) {

            return {

                valid: false,

                reason:
                    "Inner path is locked until this player captures an opponent piece."

            };

        }


        /*
         * Safe positions prohibit capture, but movement itself
         * remains legal.
         */
        if (
            isSafePosition(
                destination
            )
        ) {

            return {

                valid: true,

                distance,

                destination,

                safe: true

            };

        }


        /*
         * Normal square occupancy.
         */
        const occupants =
            getPiecesOnPhysicalSquare(
                destination
            );


        const ownPiece =
            occupants.find(
                occupant =>
                    occupant.player ===
                    playerColor
            );


        if (ownPiece) {

            return {

                valid: false,

                reason:
                    "Own piece blocks this normal square."

            };

        }


        /*
         * If an enemy exists, it must be the same type.
         */
        const enemy =
            findAnyEnemyOnDestination(
                playerColor,
                destination
            );


        if (enemy) {

            if (
                !Rules.canCapture(
                    playerColor,
                    piece,
                    enemy.player,
                    enemy.piece,
                    false
                )
            ) {

                return {

                    valid: false,

                    reason:
                        "Knight can capture only Knight; King can capture only King."

                };

            }

        }


        return {

            valid: true,

            distance,

            destination,

            safe: false,

            capture:
                Boolean(enemy)

        };

    }


    /* ========================================================
       22. MOVE ACTIVE PIECE
       ======================================================== */

    function movePiece(
        pieceId,
        rollIndex
    ) {

        const state =
            getState();


        const playerColor =
            getCurrentPlayer();


        const roll =
            getRoll(
                rollIndex
            );


        if (!roll) {

            return {

                success: false,

                reason:
                    "Invalid roll."

            };

        }


        if (
            roll.used
        ) {

            return {

                success: false,

                reason:
                    "Roll has already been used."

            };

        }


        const piece =
            getPiece(
                playerColor,
                pieceId
            );


        if (!piece) {

            return {

                success: false,

                reason:
                    "Piece not found."

            };

        }


        if (
            piece.status !==
            STATUS.ACTIVE
        ) {

            return {

                success: false,

                reason:
                    "Only an active piece can perform a normal move."

            };

        }


        /*
         * Split mode is a different action.
         */
        if (
            turnState.splitMode
        ) {

            return {

                success: false,

                reason:
                    "Selected roll is currently in split mode."

            };

        }


        const distance =
            Rules.getMovementDistance(
                piece,
                roll.value
            );


        const destination =
            Gameplay.getDestination(
                playerColor,
                piece.position,
                distance
            );


        if (
            destination === null
        ) {

            return {

                success: false,

                reason:
                    "Illegal move: overshoot."

            };

        }


        const validation =
            validateDestination(
                playerColor,
                piece,
                roll.value,
                destination
            );


        if (
            !validation.valid
        ) {

            turnState.illegalCount++;


            return {

                success: false,

                reason:
                    validation.reason

            };

        }


        /*
         * Capture must happen before moving the attacker.
         */
        let captureResult =
            null;


        if (
            destination !== CORE &&
            !isSafePosition(
                destination
            )
        ) {

            const enemy =
                findAnyEnemyOnDestination(
                    playerColor,
                    destination
                );


            if (enemy) {

                captureResult =
                    performCapture(
                        playerColor,
                        enemy.player,
                        enemy.piece.id
                    );


                if (
                    !captureResult.success
                ) {

                    return captureResult;

                }

            }

        }


        /*
         * Move the piece.
         */
        State.setPiecePosition(
            playerColor,
            pieceId,
            destination
        );


        /*
         * Core reached.
         */
        let reachedCore =
            false;


        if (
            destination === CORE
        ) {

            reachedCore =
                true;


            State.markCoreReached(
                playerColor
            );


            turnState.coreReachedThisTurn++;


            /*
             * Reaching Core grants a bonus roll.
             */
            turnState.bonusRolls++;


            /*
             * If all four pieces are in Core, player is placed.
             */
            checkPlayerVictory(
                playerColor
            );

        }


        /*
         * Consume roll.
         */
        roll.used =
            true;


        turnState.selectedRollIndex =
            null;


        turnState.selectedPieceId =
            null;


        turnState.splitMode =
            false;


        stateAvailableMoves();


        /*
         * If the player has finished the game, stop.
         */
        if (
            state.gameOver
        ) {

            return {

                success: true,

                action:
                    "move",

                player:
                    playerColor,

                pieceId,

                destination,

                distance,

                capture:
                    captureResult,

                reachedCore,

                gameOver: true

            };

        }


        /*
         * Determine whether turn can continue.
         */
        const remaining =
            remainingUnusedRolls();


        if (
            remaining.length === 0
        ) {

            /*
             * If bonus rolls exist, keep the turn in roll phase.
             */
            if (
                turnState.bonusRolls > 0
            ) {

                turnState.phase =
                    "ROLL";

                state.hasRolled =
                    false;

                state.lastRoll =
                    null;

                state.lastCoins =
                    [];


                return {

                    success: true,

                    action:
                        "move",

                    player:
                        playerColor,

                    pieceId,

                    destination,

                    distance,

                    capture:
                        captureResult,

                    reachedCore,

                    bonusRollAvailable: true,

                    phase:
                        turnState.phase

                };

            }


            /*
             * No chunks and no bonus → next player.
             */
            const end =
                endTurn(
                    "all-rolls-used"
                );


            return {

                success: true,

                action:
                    "move",

                player:
                    playerColor,

                pieceId,

                destination,

                distance,

                capture:
                    captureResult,

                reachedCore,

                turnEnded: true,

                nextPlayer:
                    end.nextPlayer

            };

        }


        /*
         * No-waste rule:
         *
         * If every remaining chunk has no legal assignment,
         * the turn automatically ends.
         */
        if (
            allRemainingChunksUnusable()
        ) {

            const end =
                endTurn(
                    "no-legal-moves"
                );


            return {

                success: true,

                action:
                    "move",

                player:
                    playerColor,

                pieceId,

                destination,

                distance,

                capture:
                    captureResult,

                reachedCore,

                turnEnded: true,

                reason:
                    "No legal use for remaining roll-chunks.",

                nextPlayer:
                    end.nextPlayer

            };

        }


        return {

            success: true,

            action:
                "move",

            player:
                playerColor,

            pieceId,

            destination,

            distance,

            capture:
                captureResult,

            reachedCore,

            remainingRolls:
                clone(
                    remaining
                )

        };

    }


    /* ========================================================
       23. SPLIT 8 → 4 + 4
       ======================================================== */

    function splitEight(
        rollIndex
    ) {

        const roll =
            getRoll(
                rollIndex
            );


        if (!roll) {

            return {

                success: false,

                reason:
                    "Invalid roll."

            };

        }


        if (
            roll.used
        ) {

            return {

                success: false,

                reason:
                    "Roll already used."

            };

        }


        if (
            roll.value !== 8
        ) {

            return {

                success: false,

                reason:
                    "Only 8 can be split."

            };

        }


        /*
         * rules.js is authoritative here.
         */
        if (
            !Rules.canSplitRoll(
                roll.value
            )
        ) {

            return {

                success: false,

                reason:
                    "This roll cannot be split."

            };

        }


        /*
         * Only two 4s.
         */
        const split =
            Rules.getSplitRoll(
                8
            );


        if (
            !Array.isArray(
                split
            ) ||
            split.length !== 2 ||
            split[0] !== 4 ||
            split[1] !== 4
        ) {

            return {

                success: false,

                reason:
                    "Invalid split definition."

            };

        }


        turnState.splitMode =
            true;


        turnState.pendingSplit = {

            rollIndex,

            chunks: [
                {
                    value: 4,
                    used: false
                },
                {
                    value: 4,
                    used: false
                }
            ]

        };


        /*
         * The original 8 is temporarily represented by two
         * pending chunks. It is not consumed until both 4s are
         * legally assigned.
         */
        roll.split =
            true;


        return {

            success: true,

            rollIndex,

            chunks:
                [
                    4,
                    4
                ]

        };

    }


    /* ========================================================
       24. APPLY ONE SPLIT CHUNK
       ======================================================== */

    function applySplitChunk(
        pieceId,
        chunkIndex
    ) {

        if (
            !turnState.splitMode ||
            !turnState.pendingSplit
        ) {

            return {

                success: false,

                reason:
                    "No split is currently active."

            };

        }


        const pending =
            turnState.pendingSplit;


        if (
            !Number.isInteger(
                chunkIndex
            ) ||
            chunkIndex < 0 ||
            chunkIndex > 1
        ) {

            return {

                success: false,

                reason:
                    "Invalid split chunk."

            };

        }


        const chunk =
            pending.chunks[
                chunkIndex
            ];


        if (
            chunk.used
        ) {

            return {

                success: false,

                reason:
                    "Split chunk already used."

            };

        }


        const playerColor =
            getCurrentPlayer();


        const piece =
            getPiece(
                playerColor,
                pieceId
            );


        if (!piece) {

            return {

                success: false,

                reason:
                    "Piece not found."

            };

        }


        /*
         * A split 4 may be used exactly like an ordinary 4:
         *
         * - Knight: 4 blocks
         * - King: 2 blocks
         *
         * Or it may be used for initial entry/comeback.
         */
        const originalPosition =
            piece.position;


        /*
         * Initial entry.
         */
        if (
            piece.status ===
            STATUS.NEVER_ACTIVATED
        ) {

            if (
                chunk.value !== 4
            ) {

                return {

                    success: false,

                    reason:
                        "Invalid split entry."

                };

            }


            const startPosition =
                Gameplay.getStartPosition(
                    playerColor
                );


            State.activatePiece(
                playerColor,
                pieceId,
                startPosition
            );


            chunk.used =
                true;


            return finalizeSplitChunk(
                chunkIndex,
                {
                    action:
                        "initial-entry",

                    pieceId,

                    position:
                        startPosition

                }
            );

        }


        /*
         * Comeback.
         */
        if (
            piece.status ===
            STATUS.INACTIVE
        ) {

            if (
                !Rules.canPieceComeback(
                    piece,
                    chunk.value
                )
            ) {

                return {

                    success: false,

                    reason:
                        "This piece cannot use a split-4 comeback."

                };

            }


            const startPosition =
                Gameplay.getStartPosition(
                    playerColor
                );


            State.activatePiece(
                playerColor,
                pieceId,
                startPosition
            );


            chunk.used =
                true;


            return finalizeSplitChunk(
                chunkIndex,
                {
                    action:
                        "comeback",

                    pieceId,

                    position:
                        startPosition

                }
            );

        }


        /*
         * Normal movement.
         */
        if (
            piece.status !==
            STATUS.ACTIVE
        ) {

            return {

                success: false,

                reason:
                    "Piece cannot use this split chunk."

            };

        }


        const distance =
            Rules.getMovementDistance(
                piece,
                4
            );


        const destination =
            Gameplay.getDestination(
                playerColor,
                originalPosition,
                distance
            );


        if (
            destination === null
        ) {

            return {

                success: false,

                reason:
                    "Split chunk overshoots."

            };

        }


        const validation =
            validateDestination(
                playerColor,
                piece,
                4,
                destination
            );


        if (
            !validation.valid
        ) {

            return {

                success: false,

                reason:
                    validation.reason

            };

        }


        let captureResult =
            null;


        if (
            destination !== CORE &&
            !isSafePosition(
                destination
            )
        ) {

            const enemy =
                findAnyEnemyOnDestination(
                    playerColor,
                    destination
                );


            if (enemy) {

                captureResult =
                    performCapture(
                        playerColor,
                        enemy.player,
                        enemy.piece.id
                    );


                if (
                    !captureResult.success
                ) {

                    return captureResult;

                }

            }

        }


        State.setPiecePosition(
            playerColor,
            pieceId,
            destination
        );


        if (
            destination === CORE
        ) {

            State.markCoreReached(
                playerColor
            );


            turnState.coreReachedThisTurn++;


            turnState.bonusRolls++;


            checkPlayerVictory(
                playerColor
            );

        }


        chunk.used =
            true;


        return finalizeSplitChunk(
            chunkIndex,
            {

                action:
                    "move",

                pieceId,

                from:
                    originalPosition,

                destination,

                distance,

                capture:
                    captureResult

            }
        );

    }


    /* ========================================================
       25. FINALIZE SPLIT CHUNK
       ======================================================== */

    function finalizeSplitChunk(
        chunkIndex,
        result
    ) {

        const pending =
            turnState.pendingSplit;


        if (!pending) {

            return {

                success: false,

                reason:
                    "Split state missing."

            };

        }


        const allUsed =
            pending.chunks.every(
                chunk =>
                    chunk.used
            );


        if (
            allUsed
        ) {

            const originalRoll =
                getRoll(
                    pending.rollIndex
                );


            if (originalRoll) {

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


            /*
             * If the split caused a victory, don't advance.
             */
            if (
                getState().gameOver
            ) {

                return {

                    success: true,

                    ...result,

                    splitComplete: true,

                    gameOver: true

                };

            }


            /*
             * If no more chunks remain, handle bonus or end.
             */
            if (
                remainingUnusedRolls().length === 0
            ) {

                if (
                    turnState.bonusRolls > 0
                ) {

                    turnState.phase =
                        "ROLL";


                    getState().hasRolled =
                        false;


                    getState().lastRoll =
                        null;


                    getState().lastCoins =
                        [];


                } else {

                    const end =
                        endTurn(
                            "split-complete"
                        );


                    return {

                        success: true,

                        ...result,

                        splitComplete: true,

                        turnEnded: true,

                        nextPlayer:
                            end.nextPlayer

                    };

                }

            }


            return {

                success: true,

                ...result,

                splitComplete: true

            };

        }


        /*
         * One 4 remains.
         *
         * The original 8 is not fully consumed yet.
         */
        turnState.selectedRollIndex =
            pending.rollIndex;


        return {

            success: true,

            ...result,

            splitComplete: false,

            remainingSplitChunk:
                pending.chunks.findIndex(
                    chunk =>
                        !chunk.used
                )

        };

    }


    /* ========================================================
       26. LEGAL PIECES FOR A ROLL
       ======================================================== */

    function getLegalPiecesForRoll(
        roll
    ) {

        const player =
            getCurrentPlayerObject();


        if (!player) {
            return [];
        }


        const legal = [];


        for (
            const piece of
            player.pieces
        ) {

            const action =
                Rules.getPieceActionType(
                    piece,
                    roll
                );


            if (!action) {
                continue;
            }


            /*
             * Initial entry.
             *
             * A 4 and 8 are legal for never-activated pieces.
             */
            if (
                action ===
                "initial-entry"
            ) {

                legal.push({

                    pieceId:
                        piece.id,

                    type:
                        piece.type,

                    action,

                    roll

                });

                continue;

            }


            /*
             * Comeback.
             */
            if (
                action ===
                "comeback"
            ) {

                legal.push({

                    pieceId:
                        piece.id,

                    type:
                        piece.type,

                    action,

                    roll

                });

                continue;

            }


            /*
             * Normal movement.
             */
            if (
                action ===
                "move"
            ) {

                const distance =
                    Rules.getMovementDistance(
                        piece,
                        roll
                    );


                const destination =
                    Gameplay.getDestination(
                        getCurrentPlayer(),
                        piece.position,
                        distance
                    );


                if (
                    destination === null
                ) {

                    continue;

                }


                const validation =
                    validateDestination(
                        getCurrentPlayer(),
                        piece,
                        roll,
                        destination
                    );


                if (
                    !validation.valid
                ) {

                    continue;

                }


                legal.push({

                    pieceId:
                        piece.id,

                    type:
                        piece.type,

                    action,

                    roll,

                    from:
                        piece.position,

                    distance,

                    destination

                });

            }

        }


        return legal;

    }


    /* ========================================================
       27. ALL AVAILABLE ACTIONS
       ======================================================== */

    function getAllAvailableActions() {

        const actions = [];


        turnState.rolls.forEach(
            (
                roll,
                index
            ) => {

                if (
                    roll.used
                ) {

                    return;

                }


                const pieces =
                    getLegalPiecesForRoll(
                        roll.value
                    );


                actions.push({

                    rollIndex:
                        index,

                    roll:
                        roll.value,

                    pieces

                });

            }
        );


        return actions;

    }


    function stateAvailableMoves() {

        const state =
            getState();


        state.availableMoves =
            getAllAvailableActions();


        return state.availableMoves;

    }


    /* ========================================================
       28. NO-WASTE RULE
       ======================================================== */

    function isRollUsable(
        roll
    ) {

        if (
            roll.used
        ) {

            return false;

        }


        return (
            getLegalPiecesForRoll(
                roll.value
            ).length > 0
        );

    }


    function allRemainingChunksUnusable() {

        const remaining =
            remainingUnusedRolls();


        if (
            remaining.length === 0
        ) {

            return false;

        }


        return remaining.every(
            roll =>
                !isRollUsable(
                    roll
                )
        );

    }


    /* ========================================================
       29. SELECTED MOVE
       ======================================================== */

    function applySelectedMove() {

        if (
            turnState.selectedRollIndex ===
            null
        ) {

            return {

                success: false,

                reason:
                    "No roll selected."

            };

        }


        if (
            !turnState.selectedPieceId
        ) {

            return {

                success: false,

                reason:
                    "No piece selected."

            };

        }


        return movePiece(
            turnState.selectedPieceId,
            turnState.selectedRollIndex
        );

    }


    /* ========================================================
       30. SELECTED INITIAL ENTRY
       ======================================================== */

    function applySelectedEntry() {

        if (
            turnState.selectedRollIndex ===
            null
        ) {

            return {

                success: false,

                reason:
                    "No roll selected."

            };

        }


        if (
            !turnState.selectedPieceId
        ) {

            return {

                success: false,

                reason:
                    "No piece selected."

            };

        }


        return initialEntry(
            [
                turnState.selectedPieceId
            ],
            turnState.selectedRollIndex
        );

    }


    /* ========================================================
       31. PLAYER VICTORY
       ======================================================== */

    function checkPlayerVictory(
        playerColor
    ) {

        const player =
            State.getPlayer(
                playerColor
            );


        if (!player) {
            return false;
        }


        if (
            !Rules.hasPlayerWon(
                player
            )
        ) {

            return false;

        }


        if (
            placementOrder.includes(
                playerColor
            )
        ) {

            return true;

        }


        placementOrder.push(
            playerColor
        );


        /*
         * Player placement is stored on state for UI/statistics.
         */
        const state =
            getState();


        if (
            !Array.isArray(
                state.placementOrder
            )
        ) {

            state.placementOrder =
                [];

        }


        state.placementOrder =
            [
                ...placementOrder
            ];


        /*
         * Game finishes after three players are placed.
         *
         * The fourth remaining player is automatically last.
         */
        if (
            placementOrder.length >= 3
        ) {

            const remainingPlayer =
                activePlayers.find(
                    color =>
                        !placementOrder.includes(
                            color
                        )
                );


            if (
                remainingPlayer &&
                !placementOrder.includes(
                    remainingPlayer
                )
            ) {

                placementOrder.push(
                    remainingPlayer
                );

            }


            state.placementOrder =
                [
                    ...placementOrder
                ];


            state.gameOver =
                true;


            turnState.phase =
                "GAME_OVER";


            return true;

        }


        return true;

    }


    /* ========================================================
       32. FORCE CORE CHECK
       ======================================================== */

    function canEnterCore(
        playerColor
    ) {

        return Rules.canPlayerEnterCore(
            getState(),
            playerColor
        );

    }


    /* ========================================================
       33. PIECE DISTANCE
       ======================================================== */

    function getPieceDistanceToCore(
        playerColor,
        pieceId
    ) {

        const piece =
            getPiece(
                playerColor,
                pieceId
            );


        if (!piece) {
            return null;
        }


        if (
            piece.status !==
            STATUS.ACTIVE
        ) {

            return null;

        }


        if (
            piece.position ===
            CORE
        ) {

            return 0;

        }


        return Gameplay.getDistanceToCore(
            playerColor,
            piece.position
        );

    }


    /* ========================================================
       34. BOARD OCCUPANCY API
       ======================================================== */

    function getOccupants(
        logicalPosition
    ) {

        return getPiecesOnPhysicalSquare(
            logicalPosition
        ).map(
            occupant => ({

                player:
                    occupant.player,

                piece:
                    clone(
                        occupant.piece
                    )

            })
        );

    }


    /* ========================================================
       35. LEGAL MOVE QUERY
       ======================================================== */

    function getLegalMovesForPiece(
        playerColor,
        pieceId,
        roll
    ) {

        if (
            !isActivePlayer(
                playerColor
            )
        ) {

            return [];

        }


        const piece =
            getPiece(
                playerColor,
                pieceId
            );


        if (!piece) {
            return [];
        }


        const action =
            Rules.getPieceActionType(
                piece,
                roll
            );


        if (!action) {
            return [];
        }


        if (
            action ===
            "initial-entry"
        ) {

            return [{

                action,

                pieceId,

                roll

            }];

        }


        if (
            action ===
            "comeback"
        ) {

            return [{

                action,

                pieceId,

                roll

            }];

        }


        if (
            action ===
            "move"
        ) {

            const distance =
                Rules.getMovementDistance(
                    piece,
                    roll
                );


            const destination =
                Gameplay.getDestination(
                    playerColor,
                    piece.position,
                    distance
                );


            if (
                destination === null
            ) {

                return [];

            }


            const validation =
                validateDestination(
                    playerColor,
                    piece,
                    roll,
                    destination
                );


            if (
                !validation.valid
            ) {

                return [];

            }


            return [{

                action,

                pieceId,

                roll,

                from:
                    piece.position,

                distance,

                destination

            }];

        }


        return [];

    }


    /* ========================================================
       36. RESET CURRENT TURN
       ======================================================== */

    function resetCurrentTurn() {

        resetTurnState();


        const state =
            getState();


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
       37. SET ACTIVE PLAYER COUNT
       ======================================================== */

    function setPlayerCount(
        count
    ) {

        if (
            !Number.isInteger(
                count
            )
        ) {

            return {

                success: false,

                reason:
                    "Player count must be an integer."

            };

        }


        if (
            count < 2 ||
            count > 4
        ) {

            return {

                success: false,

                reason:
                    "Player count must be 2, 3 or 4."

            };

        }


        activePlayers =
            PLAYERS.slice(
                0,
                count
            );


        return {

            success: true,

            players:
                [
                    ...activePlayers
                ]

        };

    }


    /* ========================================================
       38. PLACEMENT
       ======================================================== */

    function getPlacementOrder() {

        return [
            ...placementOrder
        ];

    }


    function getPlayerPlacement(
        playerColor
    ) {

        const index =
            placementOrder.indexOf(
                playerColor
            );


        if (
            index === -1
        ) {

            return null;

        }


        return index + 1;

    }


    /* ========================================================
       39. GAME STATUS
       ======================================================== */

    function getGameStatus() {

        const state =
            getState();


        return {

            started:
                state.started,

            gameOver:
                state.gameOver,

            currentPlayer:
                state.currentPlayer,

            activePlayers:
                [
                    ...activePlayers
                ],

            phase:
                turnState.phase,

            placementOrder:
                [
                    ...placementOrder
                ],

            turn:
                getTurnState()

        };

    }


    /* ========================================================
       40. DEBUG / VALIDATION
       ======================================================== */

    function validateEngine() {

        const errors = [];


        /*
         * Gameplay route validation.
         */
        if (
            !Gameplay.validatePlayerRoutes()
        ) {

            errors.push(
                "Gameplay player routes are invalid."
            );

        }


        /*
         * Player count.
         */
        if (
            activePlayers.length < 2 ||
            activePlayers.length > 4
        ) {

            errors.push(
                "Active player count is invalid."
            );

        }


        /*
         * Check route lengths.
         */
        for (
            const player of
            activePlayers
        ) {

            const route =
                Gameplay.getPlayerRoute(
                    player
                );


            if (
                !route ||
                route.length !== 24
            ) {

                errors.push(
                    `${player}: route must contain 24 positions.`
                );

            }

        }


        /*
         * Check start positions.
         */
        for (
            const player of
            activePlayers
        ) {

            const info =
                Gameplay.getRouteInfo(
                    player
                );


            if (
                !info
            ) {

                errors.push(
                    `${player}: missing route information.`
                );

            }

        }


        /*
         * Check Gavva mapping.
         */
        const expectedRolls = {

            0: 8,
            1: 1,
            2: 2,
            3: 3,
            4: 4,
            5: 8

        };


        for (
            const key of
            Object.keys(
                expectedRolls
            )
        ) {

            if (
                Coins.ROLL_MAP[key] !==
                expectedRolls[key]
            ) {

                errors.push(
                    `Gavva mapping ${key} is incorrect.`
                );

            }

        }


        /*
         * Check split rule.
         */
        const split =
            Rules.getSplitRoll(
                8
            );


        if (
            !Array.isArray(split) ||
            split.length !== 2 ||
            split[0] !== 4 ||
            split[1] !== 4
        ) {

            errors.push(
                "8 split rule must be 4+4."
            );

        }


        /*
         * Check King movement.
         */
        const testKing = {

            type:
                PIECE_TYPES.KING,

            status:
                STATUS.ACTIVE

        };


        if (
            Rules.getMovementDistance(
                testKing,
                2
            ) !== 1
        ) {

            errors.push(
                "King 2 → 1 movement is incorrect."
            );

        }


        if (
            Rules.getMovementDistance(
                testKing,
                4
            ) !== 2
        ) {

            errors.push(
                "King 4 → 2 movement is incorrect."
            );

        }


        if (
            Rules.getMovementDistance(
                testKing,
                8
            ) !== 4
        ) {

            errors.push(
                "King 8 → 4 movement is incorrect."
            );

        }


        if (
            Rules.getMovementDistance(
                testKing,
                3
            ) !== 0
        ) {

            errors.push(
                "King must not move on odd rolls."
            );

        }


        return {

            valid:
                errors.length === 0,

            errors

        };

    }


    /* ========================================================
       41. PUBLIC API
       ======================================================== */

    window.AstaChammaCore =
        Object.freeze({

            /*
             * Game
             */
            startGame,

            newGame,

            getGameStatus,

            getState,


            /*
             * Turns
             */
            endTurn,

            advanceToNextActivePlayer,

            resetCurrentTurn,


            /*
             * Gavva
             */
            rollGavva,


            /*
             * Selection
             */
            selectRoll,

            selectPiece,


            /*
             * Entry
             */
            initialEntry,

            comeback,


            /*
             * Movement
             */
            movePiece,

            applySelectedMove,

            applySelectedEntry,


            /*
             * Split
             */
            splitEight,

            applySplitChunk,


            /*
             * Queries
             */
            getRoll,

            getTurnState,

            getLegalPiecesForRoll,

            getLegalMovesForPiece,

            getAllAvailableActions,

            getPieceDistanceToCore,

            getOccupants,


            /*
             * Core / victory
             */
            canEnterCore,

            checkPlayerVictory,

            getPlacementOrder,

            getPlayerPlacement,


            /*
             * Settings
             */
            setPlayerCount,


            /*
             * Validation
             */
            validateEngine

        });


    /* ========================================================
       42. INITIAL ENGINE VALIDATION
       ======================================================== */

    const validation =
        validateEngine();


    if (
        !validation.valid
    ) {

        console.warn(
            "AstaChamma Core validation warnings:",
            validation.errors
        );

    } else {

        console.info(
            "AstaChamma Core initialized successfully."
        );

    }

})();