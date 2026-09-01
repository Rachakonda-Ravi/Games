/* ============================================================
   ASTACHAMMA — ACTION / MOVEMENT ENGINE
   ============================================================

   File:
       AstaChamma/app/actions.js

   RESPONSIBILITY
   --------------
   actions.js owns executable player actions:

       - initial entry
       - comeback
       - normal movement
       - destination validation
       - physical occupancy
       - capture
       - split 8 → 4 + 4
       - legal-action calculation
       - selected-action execution

   It does NOT own:

       - persistent game state structure
       - Gavva generation
       - player routes
       - movement-rule definitions
       - DOM/UI

   Those belong to:

       state.js
       coins.js
       gameplay.js
       rules.js
       core.js

   Turn state is obtained from:

       AstaChammaTurn

   ============================================================ */

(function () {

    "use strict";


    /* ========================================================
       1. DEPENDENCIES
       ======================================================== */

    const State =
        window.AstaChammaState;

    const Rules =
        window.AstaChammaRules;

    const Gameplay =
        window.AstaChammaGameplay;

    const Turn =
        window.AstaChammaTurn;


    if (
        !State ||
        !Rules ||
        !Gameplay ||
        !Turn
    ) {

        console.error(
            "AstaChamma Actions: required modules are missing."
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

            KNIGHT:
                "knight",

            KING:
                "king"

        });


    const STATUS =
        Object.freeze({

            NEVER_ACTIVATED:
                -1,

            INACTIVE:
                0,

            ACTIVE:
                1

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


    /* ========================================================
       3. STATE HELPERS
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


    function isActivePlayer(
        playerColor
    ) {

        const state =
            getState();


        if (
            Array.isArray(
                state.activePlayers
            )
        ) {

            return state.activePlayers.includes(
                playerColor
            );

        }


        return PLAYERS.includes(
            playerColor
        );

    }


    /* ========================================================
       4. TURN HELPERS
       ======================================================== */

    function getTurnState() {

        return Turn.getTurnState();

    }


    function getRoll(
        rollIndex
    ) {

        return Turn.getRoll(
            rollIndex
        );

    }


    function remainingUnusedRolls() {

        return Turn.remainingUnusedRolls();

    }


    function getTurnRollValue(
        rollIndex
    ) {

        const roll =
            getRoll(
                rollIndex
            );


        if (
            !roll
        ) {

            return null;

        }


        return roll.value;

    }


    /* ========================================================
       5. INITIAL ENTRY
       ======================================================== */

    function getInitialEntryCapacity(
        roll
    ) {

        if (
            typeof Rules.getInitialEntryCapacity ===
            "function"
        ) {

            return Rules.getInitialEntryCapacity(
                roll
            );

        }


        /*
         * Authoritative project rule:
         *
         *     4 → two pieces
         *     8 → four pieces
         */
        if (
            roll === 4
        ) {

            return 2;

        }


        if (
            roll === 8
        ) {

            return 4;

        }


        return 0;

    }


    function getInitialEntryPieces(
        playerColor
    ) {

        const player =
            State.getPlayer(
                playerColor
            );


        if (
            !player ||
            !Array.isArray(
                player.pieces
            )
        ) {

            return [];

        }


        return player.pieces.filter(
            piece =>
                piece.status ===
                STATUS.NEVER_ACTIVATED
        );

    }


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
            roll.value !== 4 &&
            roll.value !== 8
        ) {

            return {

                success:
                    false,

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


        if (
            !player
        ) {

            return {

                success:
                    false,

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


        /*
         * Remove duplicate IDs.
         */
        pieceIds =
            [
                ...new Set(
                    pieceIds
                )
            ];


        const capacity =
            getInitialEntryCapacity(
                roll.value
            );


        if (
            pieceIds.length === 0
        ) {

            return {

                success:
                    false,

                reason:
                    "No pieces selected."

            };

        }


        if (
            pieceIds.length >
            capacity
        ) {

            return {

                success:
                    false,

                reason:
                    `This roll allows at most ${capacity} initial entries.`

            };

        }


        /*
         * Validate every piece before mutating anything.
         */
        const pieces = [];


        for (
            const pieceId of
            pieceIds
        ) {

            const piece =
                State.getPiece(
                    playerColor,
                    pieceId
                );


            if (
                !piece
            ) {

                return {

                    success:
                        false,

                    reason:
                        `Piece ${pieceId} does not exist.`

                };

            }


            if (
                piece.status !==
                STATUS.NEVER_ACTIVATED
            ) {

                return {

                    success:
                        false,

                    reason:
                        `${pieceId} has already been activated.`

                };

            }


            pieces.push(
                piece
            );

        }


        const startPosition =
            Gameplay.getStartPosition(
                playerColor
            );


        if (
            startPosition === null ||
            startPosition === undefined
        ) {

            return {

                success:
                    false,

                reason:
                    "Player start position is unavailable."

            };

        }


        const entered = [];


        /*
         * Activate only after all validation has passed.
         */
        for (
            const piece of
            pieces
        ) {

            State.activatePiece(
                playerColor,
                piece.id,
                startPosition
            );


            entered.push(
                piece.id
            );

        }


        /*
         * Consume the roll once.
         */
        roll.used =
            true;


        /*
         * Clear selection.
         */
        Turn.clearSelection();


        /*
         * Recalculate legal actions.
         */
        state.availableMoves =
            getAllAvailableActions();


        state.splitAvailable =
            Turn.hasUnusedEight();


        return {

            success:
                true,

            action:
                "initial-entry",

            player:
                playerColor,

            entered,

            startPosition,

            roll:
                roll.value,

            remainingRolls:
                clone(
                    remainingUnusedRolls()
                )

        };

    }


    /* ========================================================
       6. COMEBACK
       ======================================================== */

    function comeback(
        pieceId,
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


        const playerColor =
            getCurrentPlayer();


        const piece =
            getPiece(
                playerColor,
                pieceId
            );


        if (
            !piece
        ) {

            return {

                success:
                    false,

                reason:
                    "Piece does not exist."

            };

        }


        if (
            piece.status !==
            STATUS.INACTIVE
        ) {

            return {

                success:
                    false,

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

                success:
                    false,

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


        if (
            startPosition === null ||
            startPosition === undefined
        ) {

            return {

                success:
                    false,

                reason:
                    "Player start position is unavailable."

            };

        }


        /*
         * Re-entry after capture is always at the player's
         * start position.
         */
        State.activatePiece(
            playerColor,
            pieceId,
            startPosition
        );


        roll.used =
            true;


        Turn.clearSelection();


        const state =
            getState();


        state.availableMoves =
            getAllAvailableActions();


        state.splitAvailable =
            Turn.hasUnusedEight();


        return {

            success:
                true,

            action:
                "comeback",

            player:
                playerColor,

            pieceId,

            position:
                startPosition,

            roll:
                roll.value,

            remainingRolls:
                clone(
                    remainingUnusedRolls()
                )

        };

    }


    /* ========================================================
       7. CORE / INNER LOCK
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
       8. PHYSICAL OCCUPANCY
       ======================================================== */

    function samePhysicalSquare(
        positionA,
        positionB
    ) {

        /*
         * CORE is not an ordinary physical square.
         */
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


        const state =
            getState();


        const players =
            Array.isArray(
                state.activePlayers
            )
                ? state.activePlayers
                : PLAYERS;


        for (
            const color of
            players
        ) {

            const player =
                State.getPlayer(
                    color
                );


            if (
                !player
            ) {

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
       9. SAFE POSITION
       ======================================================== */

    function isSafePosition(
        logicalPosition
    ) {

        return SAFE_POSITIONS.includes(
            logicalPosition
        );

    }


    /* ========================================================
       10. CAPTURE LOOKUP
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
       11. CAPTURE
       ======================================================== */

    function performCapture(
        attackerPlayerColor,
        defenderPlayerColor,
        defenderPieceId
    ) {

        const attacker =
            State.getPlayer(
                attackerPlayerColor
            );


        if (
            !attacker
        ) {

            return {

                success:
                    false,

                reason:
                    "Attacking player not found."

            };

        }


        const defender =
            State.getPiece(
                defenderPlayerColor,
                defenderPieceId
            );


        if (
            !defender
        ) {

            return {

                success:
                    false,

                reason:
                    "Defending piece not found."

            };

        }


        if (
            defender.status !==
            STATUS.ACTIVE
        ) {

            return {

                success:
                    false,

                reason:
                    "Defending piece is not active."

            };

        }


        /*
         * Capture is legal only when attacker and defender
         * are compatible types.
         *
         * This is checked here as an additional safety layer,
         * even though movement validation also checks it.
         */
        if (
            typeof Rules.canCapture ===
            "function"
        ) {

            const legal =
                Rules.canCapture(
                    attackerPlayerColor,
                    null,
                    defenderPlayerColor,
                    defender,
                    false
                );


            /*
             * Some versions of rules.js require the actual
             * attacking piece. If the helper cannot evaluate
             * null, movement validation remains authoritative.
             */
            if (
                legal === false
            ) {

                return {

                    success:
                        false,

                    reason:
                        "Capture is not legal."

                };

            }

        }


        State.capturePiece(
            defenderPlayerColor,
            defenderPieceId
        );


        /*
         * Capture count belongs to the ATTACKING PLAYER.
         */
        State.addCapture(
            attackerPlayerColor,
            1
        );


        /*
         * Capture grants one bonus roll.
         */
        if (
            typeof Turn.registerCapture ===
            "function"
        ) {

            Turn.registerCapture();

        } else {

            Turn.addBonusRoll(
                "capture"
            );

        }


        return {

            success:
                true,

            attacker:
                attackerPlayerColor,

            defender:
                defenderPlayerColor,

            pieceId:
                defenderPieceId,

            bonusRoll:
                true

        };

    }


    /* ========================================================
       12. MOVEMENT DISTANCE
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
       13. DESTINATION VALIDATION
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

                valid:
                    false,

                reason:
                    "Piece not found."

            };

        }


        if (
            piece.status !==
            STATUS.ACTIVE
        ) {

            return {

                valid:
                    false,

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

                valid:
                    false,

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

                valid:
                    false,

                reason:
                    "Invalid destination."

            };

        }


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

                valid:
                    false,

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

                valid:
                    false,

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

                valid:
                    false,

                reason:
                    "Move overshoots the route/Core."

            };

        }


        if (
            expectedDestination !==
            destination
        ) {

            return {

                valid:
                    false,

                reason:
                    "Destination does not match the movement distance."

            };

        }


        /*
         * CORE requirement.
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

                    valid:
                        false,

                    reason:
                        "Core entry requires at least one capture, unless all opponents are already in Core."

                };

            }


            return {

                valid:
                    true,

                distance,

                destination,

                core:
                    true

            };

        }


        /*
         * Inner area lock.
         */
        if (
            isInnerDestinationLocked(
                playerColor,
                destination
            )
        ) {

            return {

                valid:
                    false,

                reason:
                    "Inner path is locked until this player captures an opponent piece."

            };

        }


        /*
         * Safe squares cannot capture.
         */
        if (
            isSafePosition(
                destination
            )
        ) {

            return {

                valid:
                    true,

                distance,

                destination,

                safe:
                    true,

                capture:
                    false

            };

        }


        /*
         * Normal occupancy.
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


        /*
         * A normal square cannot contain two pieces.
         */
        if (
            ownPiece
        ) {

            return {

                valid:
                    false,

                reason:
                    "Own piece blocks this normal square."

            };

        }


        const enemy =
            findAnyEnemyOnDestination(
                playerColor,
                destination
            );


        if (
            enemy
        ) {

            /*
             * Knight captures Knight only.
             * King captures King only.
             */
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

                    valid:
                        false,

                    reason:
                        "Knight can capture only Knight; King can capture only King."

                };

            }

        }


        return {

            valid:
                true,

            distance,

            destination,

            safe:
                false,

            capture:
                Boolean(
                    enemy
                )

        };

    }


    /* ========================================================
       14. MOVE ACTIVE PIECE
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
                    "Roll has already been used."

            };

        }


        const piece =
            getPiece(
                playerColor,
                pieceId
            );


        if (
            !piece
        ) {

            return {

                success:
                    false,

                reason:
                    "Piece not found."

            };

        }


        if (
            piece.status !==
            STATUS.ACTIVE
        ) {

            return {

                success:
                    false,

                reason:
                    "Only an active piece can perform a normal move."

            };

        }


        const turn =
            getTurnState();


        if (
            turn.splitMode
        ) {

            return {

                success:
                    false,

                reason:
                    "Selected roll is currently in split mode."

            };

        }


        const distance =
            Rules.getMovementDistance(
                piece,
                roll.value
            );


        if (
            distance <= 0
        ) {

            return {

                success:
                    false,

                reason:
                    "Roll cannot move this piece."

            };

        }


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

                success:
                    false,

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

            Turn.registerIllegalAction();


            return {

                success:
                    false,

                reason:
                    validation.reason

            };

        }


        let captureResult =
            null;


        /*
         * Capture before moving attacker.
         */
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


            if (
                enemy
            ) {

                /*
                 * Revalidate exact capture compatibility.
                 */
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

                        success:
                            false,

                        reason:
                            "Capture is not legal."

                    };

                }


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


        const previousPosition =
            piece.position;


        /*
         * Move attacker.
         */
        State.setPiecePosition(
            playerColor,
            pieceId,
            destination
        );


        let reachedCore =
            false;


        /*
         * CORE.
         */
        if (
            destination === CORE
        ) {

            reachedCore =
                true;


            State.markCoreReached(
                playerColor
            );


            if (
                typeof Turn.registerCoreReached ===
                "function"
            ) {

                Turn.registerCoreReached();

            } else {

                Turn.addBonusRoll(
                    "core"
                );

            }


            /*
             * Core/victory belongs to Core.
             */
            const Core =
                window.AstaChammaCore;


            if (
                Core &&
                typeof Core.checkPlayerVictory ===
                "function"
            ) {

                Core.checkPlayerVictory(
                    playerColor
                );

            }

        }


        /*
         * Consume the roll.
         */
        roll.used =
            true;


        Turn.clearSelection();


        state.availableMoves =
            getAllAvailableActions();


        state.splitAvailable =
            Turn.hasUnusedEight();


        /*
         * Game-over check.
         */
        if (
            state.gameOver
        ) {

            return {

                success:
                    true,

                action:
                    "move",

                player:
                    playerColor,

                pieceId,

                from:
                    previousPosition,

                destination,

                distance,

                capture:
                    captureResult,

                reachedCore,

                gameOver:
                    true

            };

        }


        const remaining =
            remainingUnusedRolls();


        /*
         * More roll chunks remain.
         */
        if (
            remaining.length > 0
        ) {

            if (
                allRemainingChunksUnusable()
            ) {

                const ended =
                    Turn.finishTurn();


                return {

                    success:
                        true,

                    action:
                        "move",

                    player:
                        playerColor,

                    pieceId,

                    from:
                        previousPosition,

                    destination,

                    distance,

                    capture:
                        captureResult,

                    reachedCore,

                    turnEnded:
                        true,

                    reason:
                        "No legal use for remaining roll-chunks.",

                    turnState:
                        ended

                };

            }


            return {

                success:
                    true,

                action:
                    "move",

                player:
                    playerColor,

                pieceId,

                from:
                    previousPosition,

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


        /*
         * No normal chunks remain.
         *
         * A bonus roll starts AFTER this action resolves.
         */
        if (
            Turn.hasBonusRoll()
        ) {

            const nextRoll =
                Turn.prepareNextRoll();


            return {

                success:
                    true,

                action:
                    "move",

                player:
                    playerColor,

                pieceId,

                from:
                    previousPosition,

                destination,

                distance,

                capture:
                    captureResult,

                reachedCore,

                bonusRollAvailable:
                    true,

                phase:
                    nextRoll.phase

            };

        }


        /*
         * Completely finish the turn.
         *
         * Turn.finishTurn() resets the turn controller but does
         * not change the player itself.
         *
         * Core is responsible for advancing the player when the
         * public turn transition is requested.
         */
        const ended =
            Turn.finishTurn();


        return {

            success:
                true,

            action:
                "move",

            player:
                playerColor,

            pieceId,

            from:
                previousPosition,

            destination,

            distance,

            capture:
                captureResult,

            reachedCore,

            turnEnded:
                true,

            turnState:
                ended

        };

    }


    /* ========================================================
       15. SPLIT 8 → 4 + 4
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
                    "Only 8 can be split."

            };

        }


        if (
            typeof Rules.canSplitRoll ===
            "function"
            &&
            !Rules.canSplitRoll(
                roll.value
            )
        ) {

            return {

                success:
                    false,

                reason:
                    "This roll cannot be split."

            };

        }


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

                success:
                    false,

                reason:
                    "Invalid split definition."

            };

        }


        /*
         * Start split through the dedicated Turn module.
         */
        const result =
            Turn.splitEight(
                rollIndex
            );


        if (
            !result.success
        ) {

            return result;

        }


        const state =
            getState();


        state.splitAvailable =
            true;


        state.splitUsed =
            false;


        state.splitMoves =
            [];


        return {

            success:
                true,

            action:
                "split-eight",

            rollIndex,

            chunks:
                [
                    4,
                    4
                ]

        };

    }


    /* ========================================================
       16. APPLY ONE SPLIT CHUNK
       ======================================================== */

    function applySplitChunk(
        pieceId,
        chunkIndex
    ) {

        const turn =
            getTurnState();


        if (
            !turn.splitMode
        ) {

            return {

                success:
                    false,

                reason:
                    "No split is currently active."

            };

        }


        const pending =
            Turn.getPendingSplit();


        if (
            !pending
        ) {

            return {

                success:
                    false,

                reason:
                    "Split state is missing."

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
            pending.chunks[
                chunkIndex
            ];


        if (
            !chunk ||
            chunk.used
        ) {

            return {

                success:
                    false,

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


        if (
            !piece
        ) {

            return {

                success:
                    false,

                reason:
                    "Piece not found."

            };

        }


        /*
         * ----------------------------------------------------
         * INITIAL ENTRY
         * ----------------------------------------------------
         */
        if (
            piece.status ===
            STATUS.NEVER_ACTIVATED
        ) {

            /*
             * A split chunk is always 4.
             */
            if (
                chunk.value !== 4
            ) {

                return {

                    success:
                        false,

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


            const assigned =
                Turn.assignSplitChunk(
                    chunkIndex,
                    pieceId
                );


            if (
                !assigned.success
            ) {

                return assigned;

            }


            Turn.markSplitChunkUsed(
                chunkIndex
            );


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
         * ----------------------------------------------------
         * COMEBACK
         * ----------------------------------------------------
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

                    success:
                        false,

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


            const assigned =
                Turn.assignSplitChunk(
                    chunkIndex,
                    pieceId
                );


            if (
                !assigned.success
            ) {

                return assigned;

            }


            Turn.markSplitChunkUsed(
                chunkIndex
            );


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
         * ----------------------------------------------------
         * NORMAL MOVEMENT
         * ----------------------------------------------------
         */
        if (
            piece.status !==
            STATUS.ACTIVE
        ) {

            return {

                success:
                    false,

                reason:
                    "Piece cannot use this split chunk."

            };

        }


        const originalPosition =
            piece.position;


        const distance =
            Rules.getMovementDistance(
                piece,
                4
            );


        if (
            distance <= 0
        ) {

            return {

                success:
                    false,

                reason:
                    "This piece cannot move with split-4."

            };

        }


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

                success:
                    false,

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

                success:
                    false,

                reason:
                    validation.reason

            };

        }


        let captureResult =
            null;


        /*
         * Capture before movement.
         */
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


            if (
                enemy
            ) {

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
         * Assign the chunk before mutation is finalized.
         */
        const assigned =
            Turn.assignSplitChunk(
                chunkIndex,
                pieceId
            );


        if (
            !assigned.success
        ) {

            return assigned;

        }


        State.setPiecePosition(
            playerColor,
            pieceId,
            destination
        );


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


            if (
                typeof Turn.registerCoreReached ===
                "function"
            ) {

                Turn.registerCoreReached();

            } else {

                Turn.addBonusRoll(
                    "core"
                );

            }


            const Core =
                window.AstaChammaCore;


            if (
                Core &&
                typeof Core.checkPlayerVictory ===
                "function"
            ) {

                Core.checkPlayerVictory(
                    playerColor
                );

            }

        }


        Turn.markSplitChunkUsed(
            chunkIndex
        );


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
                    captureResult,

                reachedCore

            }
        );

    }


    /* ========================================================
       17. FINALIZE SPLIT CHUNK
       ======================================================== */

    function finalizeSplitChunk(
        chunkIndex,
        result
    ) {

        const pending =
            Turn.getPendingSplit();


        if (
            !pending
        ) {

            return {

                success:
                    false,

                reason:
                    "Split state missing."

            };

        }


        const complete =
            pending.chunks.every(
                chunk =>
                    chunk.used
            );


        const state =
            getState();


        /*
         * Record the action for UI/debugging.
         */
        if (
            !Array.isArray(
                state.splitMoves
            )
        ) {

            state.splitMoves =
                [];

        }


        state.splitMoves.push(
            clone(
                result
            )
        );


        if (
            !complete
        ) {

            state.availableMoves =
                getAllAvailableActions();


            return {

                success:
                    true,

                ...result,

                splitComplete:
                    false,

                remainingSplitChunk:
                    pending.chunks.findIndex(
                        chunk =>
                            !chunk.used
                    )

            };

        }


        /*
         * Both 4s are consumed.
         *
         * The Turn module owns finalizing the original 8.
         */
        const finalized =
            Turn.finalizeSplit();


        if (
            !finalized.success
        ) {

            return finalized;

        }


        state.splitAvailable =
            Turn.hasUnusedEight();


        state.splitUsed =
            true;


        state.availableMoves =
            getAllAvailableActions();


        /*
         * A Core victory ends the game immediately.
         */
        if (
            state.gameOver
        ) {

            return {

                success:
                    true,

                ...result,

                splitComplete:
                    true,

                gameOver:
                    true

            };

        }


        /*
         * If another normal roll remains, stay in MOVE.
         */
        const remaining =
            remainingUnusedRolls();


        if (
            remaining.length > 0
        ) {

            return {

                success:
                    true,

                ...result,

                splitComplete:
                    true,

                remainingRolls:
                    clone(
                        remaining
                    )

            };

        }


        /*
         * A bonus roll starts only after the split has fully
         * resolved.
         */
        if (
            Turn.hasBonusRoll()
        ) {

            const next =
                Turn.prepareNextRoll();


            return {

                success:
                    true,

                ...result,

                splitComplete:
                    true,

                bonusRollAvailable:
                    true,

                phase:
                    next.phase

            };

        }


        /*
         * Nothing remains.
         */
        const ended =
            Turn.finishTurn();


        return {

            success:
                true,

            ...result,

            splitComplete:
                true,

            turnEnded:
                true,

            turnState:
                ended

        };

    }


    /* ========================================================
       18. LEGAL PIECES FOR ROLL
       ======================================================== */

    function getLegalPiecesForRoll(
        roll
    ) {

        const player =
            getCurrentPlayerObject();


        if (
            !player
        ) {

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


            if (
                !action
            ) {

                continue;

            }


            /*
             * Initial entry.
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


                if (
                    distance <= 0
                ) {

                    continue;

                }


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

                    destination,

                    capture:
                        Boolean(
                            validation.capture
                        ),

                    safe:
                        Boolean(
                            validation.safe
                        )

                });

            }

        }


        return legal;

    }


    /* ========================================================
       19. LEGAL MOVES FOR SPECIFIC PIECE
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


        if (
            !piece
        ) {

            return [];

        }


        const action =
            Rules.getPieceActionType(
                piece,
                roll
            );


        if (
            !action
        ) {

            return [];

        }


        /*
         * Initial entry.
         */
        if (
            action ===
            "initial-entry"
        ) {

            return [

                {

                    action,

                    pieceId,

                    roll

                }

            ];

        }


        /*
         * Comeback.
         */
        if (
            action ===
            "comeback"
        ) {

            return [

                {

                    action,

                    pieceId,

                    roll

                }

            ];

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


            if (
                distance <= 0
            ) {

                return [];

            }


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


            return [

                {

                    action,

                    pieceId,

                    roll,

                    from:
                        piece.position,

                    distance,

                    destination,

                    capture:
                        Boolean(
                            validation.capture
                        ),

                    safe:
                        Boolean(
                            validation.safe
                        )

                }

            ];

        }


        return [];

    }


    /* ========================================================
       20. ALL AVAILABLE ACTIONS
       ======================================================== */

    function getAllAvailableActions() {

        const actions = [];


        const turn =
            getTurnState();


        for (
            let index = 0;
            index <
            turn.rolls.length;
            index++
        ) {

            const roll =
                turn.rolls[
                    index
                ];


            if (
                roll.used
            ) {

                continue;

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


        /*
         * If a split is active, expose its two pending
         * chunks as available actions.
         */
        if (
            turn.splitMode &&
            turn.pendingSplit
        ) {

            turn.pendingSplit.chunks.forEach(
                (
                    chunk,
                    chunkIndex
                ) => {

                    if (
                        chunk.used
                    ) {

                        return;

                    }


                    actions.push({

                        rollIndex:
                            turn.pendingSplit.rollIndex,

                        roll:
                            4,

                        chunkIndex,

                        split:
                            true,

                        pieces:
                            getLegalPiecesForRoll(
                                4
                            )

                    });

                }
            );

        }


        return actions;

    }


    /* ========================================================
       21. WRITE AVAILABLE MOVES TO STATE
       ======================================================== */

    function stateAvailableMoves() {

        const state =
            getState();


        state.availableMoves =
            getAllAvailableActions();


        return state.availableMoves;

    }


    /* ========================================================
       22. NO-WASTE RULE
       ======================================================== */

    function isRollUsable(
        roll
    ) {

        if (
            !roll ||
            roll.used
        ) {

            return false;

        }


        /*
         * A split 8 is usable if either 8 itself or 4+4 has
         * a legal assignment.
         */
        if (
            roll.value === 8
        ) {

            if (
                getLegalPiecesForRoll(
                    8
                ).length > 0
            ) {

                return true;

            }


            const split =
                getLegalPiecesForRoll(
                    4
                );


            return (
                split.length >= 2
            );

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
       23. SELECTED MOVE
       ======================================================== */

    function applySelectedMove() {

        const turn =
            getTurnState();


        if (
            turn.selectedRollIndex ===
            null
        ) {

            return {

                success:
                    false,

                reason:
                    "No roll selected."

            };

        }


        if (
            !turn.selectedPieceId
        ) {

            return {

                success:
                    false,

                reason:
                    "No piece selected."

            };

        }


        return movePiece(
            turn.selectedPieceId,
            turn.selectedRollIndex
        );

    }


    /* ========================================================
       24. SELECTED INITIAL ENTRY
       ======================================================== */

    function applySelectedEntry() {

        const turn =
            getTurnState();


        if (
            turn.selectedRollIndex ===
            null
        ) {

            return {

                success:
                    false,

                reason:
                    "No roll selected."

            };

        }


        if (
            !turn.selectedPieceId
        ) {

            return {

                success:
                    false,

                reason:
                    "No piece selected."

            };

        }


        return initialEntry(
            [
                turn.selectedPieceId
            ],
            turn.selectedRollIndex
        );

    }


    /* ========================================================
       25. ACTION EXECUTOR
       ======================================================== */

    function execute(
        action
    ) {

        if (
            !action ||
            typeof action !==
            "object"
        ) {

            return {

                success:
                    false,

                reason:
                    "Action must be an object."

            };

        }


        const type =
            String(
                action.type ||
                ""
            )
            .trim()
            .toLowerCase();


        switch (
            type
        ) {

            case "select-roll":

                return Turn.selectRoll(
                    action.rollIndex
                );


            case "select-piece":

                return Turn.selectPiece(
                    action.pieceId
                );


            case "initial-entry":

            case "entry":

                return initialEntry(
                    action.pieceIds,
                    action.rollIndex
                );


            case "comeback":

                return comeback(
                    action.pieceId,
                    action.rollIndex
                );


            case "move":

                return movePiece(
                    action.pieceId,
                    action.rollIndex
                );


            case "split":

            case "split-eight":

                return splitEight(
                    action.rollIndex
                );


            case "split-chunk":

                return applySplitChunk(
                    action.pieceId,
                    action.chunkIndex
                );


            case "selected-move":

                return applySelectedMove();


            case "selected-entry":

                return applySelectedEntry();


            default:

                return {

                    success:
                        false,

                    reason:
                        `Unknown action type: ${type || "(empty)"}`

                };

        }

    }


    /* ========================================================
       26. PUBLIC API
       ======================================================== */

    window.AstaChammaActions =
        Object.freeze({

            /*
             * State / turn
             */
            getState,

            getCurrentPlayer,

            getTurnState,

            getRoll,

            remainingUnusedRolls,


            /*
             * Selection
             */
            selectRoll:
                Turn.selectRoll,

            selectPiece:
                Turn.selectPiece,

            clearSelection:
                Turn.clearSelection,


            /*
             * Entry
             */
            getInitialEntryCapacity,

            getInitialEntryPieces,

            initialEntry,

            applySelectedEntry,


            /*
             * Comeback
             */
            comeback,


            /*
             * Inner/Core
             */
            playerHasCapturePermission,

            isInnerDestinationLocked,


            /*
             * Physical board
             */
            samePhysicalSquare,

            getPiecesOnPhysicalSquare,

            getOccupants:
                function (logicalPosition) {

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

                },


            /*
             * Safe squares
             */
            isSafePosition,


            /*
             * Capture
             */
            findEnemyOnDestination,

            findAnyEnemyOnDestination,

            performCapture,


            /*
             * Movement
             */
            getMovementDistanceForPiece,

            validateDestination,

            movePiece,

            applySelectedMove,


            /*
             * Split
             */
            splitEight,

            applySplitChunk,

            finalizeSplitChunk,


            /*
             * Legal actions
             */
            getLegalPiecesForRoll,

            getLegalMovesForPiece,

            getAllAvailableActions,

            stateAvailableMoves,


            /*
             * No-waste
             */
            isRollUsable,

            allRemainingChunksUnusable,


            /*
             * Generic dispatcher
             */
            execute

        });


    /* ========================================================
       27. INITIALIZATION MESSAGE
       ======================================================== */

    console.info(
        "AstaChamma Actions loaded."
    );


})();