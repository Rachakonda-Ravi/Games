/* ============================================================
   ASTACHAMMA — RULES ENGINE
   ============================================================

   This module answers one fundamental question:

       "Is this action legal?"

   It does NOT:
       - modify game state
       - generate Gavva
       - render the board
       - control the UI
       - move pieces directly
       - perform captures directly

   Other modules:
       state.js     → stores game state
       coins.js     → generates Gavva / roll
       gameplay.js  → player routes / board geometry
       core.js      → performs actions using these rules

   ============================================================ */


/* ============================================================
   1. CONSTANTS
   ============================================================ */

const RULES_PLAYERS = Object.freeze([
    "red",
    "blue",
    "green",
    "yellow"
]);

const RULES_PIECE_TYPES = Object.freeze({
    KNIGHT: "knight",
    KING: "king"
});

const RULES_STATUS = Object.freeze({
    NEVER_ACTIVATED: -1,
    INACTIVE: 0,
    ACTIVE: 1
});

const RULES_CORE_POSITION = 25;


/* ============================================================
   2. BASIC VALIDATION
   ============================================================ */

function isValidPlayer(
    playerColor
) {

    return RULES_PLAYERS.includes(
        playerColor
    );

}


function isValidPieceType(
    pieceType
) {

    return (
        pieceType ===
            RULES_PIECE_TYPES.KNIGHT
        ||
        pieceType ===
            RULES_PIECE_TYPES.KING
    );

}


function isValidStatus(
    status
) {

    return (
        status ===
            RULES_STATUS.NEVER_ACTIVATED
        ||
        status ===
            RULES_STATUS.INACTIVE
        ||
        status ===
            RULES_STATUS.ACTIVE
    );

}


function isValidRoll(
    roll
) {

    return (
        Number.isInteger(roll)
        &&
        roll >= 1
        &&
        roll <= 8
    );

}


/* ============================================================
   3. PIECE TYPE
   ============================================================ */

function isKnight(
    piece
) {

    return (
        piece &&
        piece.type ===
            RULES_PIECE_TYPES.KNIGHT
    );

}


function isKing(
    piece
) {

    return (
        piece &&
        piece.type ===
            RULES_PIECE_TYPES.KING
    );

}


/* ============================================================
   4. PIECE STATUS
   ============================================================ */

function isNeverActivated(
    piece
) {

    return (
        piece &&
        piece.status ===
            RULES_STATUS.NEVER_ACTIVATED
    );

}


function isInactive(
    piece
) {

    return (
        piece &&
        piece.status ===
            RULES_STATUS.INACTIVE
    );

}


function isActive(
    piece
) {

    return (
        piece &&
        piece.status ===
            RULES_STATUS.ACTIVE
    );

}


/* ============================================================
   5. KING ROLL RULE
   ============================================================

   Knight:
       every roll can be used.

   King:
       only even rolls can be used.

   ============================================================ */

function canKingUseRoll(
    roll
) {

    if (
        !isValidRoll(
            roll
        )
    ) {

        return false;

    }

    return (
        roll % 2 === 0
    );

}


function canKnightUseRoll(
    roll
) {

    return isValidRoll(
        roll
    );

}


/* ============================================================
   6. MOVEMENT DISTANCE
   ============================================================

   Knight:
       1 roll = 1 block
       2 roll = 2 blocks
       ...
       8 roll = 8 blocks

   King:
       2 roll = 1 block
       4 roll = 2 blocks
       6 roll = 3 blocks
       8 roll = 4 blocks

   Odd rolls cannot move King.

   ============================================================ */

function getMovementDistance(
    piece,
    roll
) {

    if (
        !piece ||
        !isValidRoll(roll)
    ) {

        return 0;

    }


    if (
        isKnight(piece)
    ) {

        return roll;

    }


    if (
        isKing(piece)
    ) {

        if (
            !canKingUseRoll(
                roll
            )
        ) {

            return 0;

        }

        return roll / 2;

    }


    return 0;

}


/* ============================================================
   7. GENERAL MOVEMENT PERMISSION
   ============================================================ */

function canPieceUseRoll(
    piece,
    roll
) {

    if (!piece) {
        return false;
    }

    if (
        !isValidRoll(
            roll
        )
    ) {

        return false;

    }

    if (
        !isActive(piece)
    ) {

        return false;

    }


    if (
        isKnight(piece)
    ) {

        return canKnightUseRoll(
            roll
        );

    }


    if (
        isKing(piece)
    ) {

        return canKingUseRoll(
            roll
        );

    }


    return false;

}


/* ============================================================
   8. SPLITTING
   ============================================================

   ONLY 8 can split.

       8 → 4 + 4

   No other roll can split.

   ============================================================ */

function canSplitRoll(
    roll
) {

    return (
        roll === 8
    );

}


function getSplitRoll(
    roll
) {

    if (
        !canSplitRoll(
            roll
        )
    ) {

        return null;

    }

    return [
        4,
        4
    ];

}


/* ============================================================
   9. INITIAL ENTRY
   ============================================================

   Piece status:
       -1 = never activated

   Initial entry rules:

       Roll 4:
           up to 2 pieces may initially enter.

       Roll 8:
           up to 4 pieces may initially enter.

   ============================================================ */

function getInitialEntryCapacity(
    roll
) {

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


function canInitialActivatePiece(
    piece,
    roll
) {

    if (!piece) {
        return false;
    }


    if (
        !isNeverActivated(
            piece
        )
    ) {

        return false;

    }


    return (
        roll === 4 ||
        roll === 8
    );

}


/* ============================================================
   10. COMEBACK AFTER CAPTURE
   ============================================================

   Captured piece:
       status = 0

   Knight comeback:
       4

   King comeback:
       8

   ============================================================ */

function getComebackRoll(
    piece
) {

    if (!piece) {
        return null;
    }


    if (
        isKnight(piece)
    ) {

        return 4;

    }


    if (
        isKing(piece)
    ) {

        return 8;

    }


    return null;

}


function canPieceComeback(
    piece,
    roll
) {

    if (
        !piece ||
        !isValidRoll(roll)
    ) {

        return false;

    }


    if (
        !isInactive(piece)
    ) {

        return false;

    }


    return (
        getComebackRoll(
            piece
        ) === roll
    );

}


/* ============================================================
   11. POSITION VALIDATION
   ============================================================ */

function isRoutePosition(
    position
) {

    return (
        Number.isInteger(position)
        &&
        position >= 1
        &&
        position <= 24
    );

}


function isCorePosition(
    position
) {

    return (
        position ===
        RULES_CORE_POSITION
    );

}


function isValidLogicalPosition(
    position
) {

    return (
        isRoutePosition(position)
        ||
        isCorePosition(position)
    );

}


/* ============================================================
   12. CORE ENTRY REQUIREMENT
   ============================================================

   A player must have captured at least one opponent piece
   before that player's pieces may enter Core.

   IMPORTANT:

   This is PLAYER-WISE.

   It does NOT belong to an individual piece.

   Exception:

   Core entry is also permitted when no opponent piece
   remains outside Core.

   A captured/inactive piece is NOT an opponent piece
   remaining outside Core because it is no longer on the board.

   ============================================================ */

function hasCapturePermission(
    player
) {

    if (!player) {
        return false;
    }


    return (
        Number.isInteger(
            player.captures
        )
        &&
        player.captures >= 1
    );

}


/* ============================================================
   13. OPPONENT CORE EXCEPTION
   ============================================================ */

function areAllOpponentsInCore(
    state,
    playerColor
) {

    if (
        !state ||
        !state.players ||
        !isValidPlayer(
            playerColor
        )
    ) {

        return false;

    }


    for (
        const color of RULES_PLAYERS
    ) {

        if (
            color ===
            playerColor
        ) {

            continue;

        }


        const opponent =
            state.players[color];


        if (
            !opponent ||
            !Array.isArray(
                opponent.pieces
            )
        ) {

            return false;

        }


        /*
         * Only pieces that are still on the board
         * can prevent the Core exception.
         *
         * Therefore:
         *
         * ACTIVE + not Core
         *     → still outside Core
         *
         * ACTIVE + Core
         *     → already in Core
         *
         * INACTIVE
         *     → captured, no longer on board
         *
         * NEVER_ACTIVATED
         *     → has not entered the board
         *
         * Neither INACTIVE nor NEVER_ACTIVATED counts
         * as an opponent piece remaining outside Core.
         */

        const outsideCore =
            opponent.pieces.some(
                piece =>
                    isActive(piece) &&
                    piece.position !==
                        RULES_CORE_POSITION
            );


        if (
            outsideCore
        ) {

            return false;

        }

    }


    return true;

}


/* ============================================================
   14. PLAYER CORE PERMISSION
   ============================================================ */

function canPlayerEnterCore(
    state,
    playerColor
) {

    if (
        !state ||
        !state.players ||
        !isValidPlayer(
            playerColor
        )
    ) {

        return false;

    }


    const player =
        state.players[
            playerColor
        ];


    /*
     * Normal condition:
     *
     * Player has captured at least one opponent.
     */

    if (
        hasCapturePermission(
            player
        )
    ) {

        return true;

    }


    /*
     * Exception:
     *
     * No opponent piece remains outside Core.
     */

    return areAllOpponentsInCore(
        state,
        playerColor
    );

}


/* ============================================================
   15. CORE MOVE PERMISSION
   ============================================================ */

function canEnterCore(
    state,
    playerColor,
    destination
) {

    if (
        destination !==
        RULES_CORE_POSITION
    ) {

        return true;

    }


    return canPlayerEnterCore(
        state,
        playerColor
    );

}


/* ============================================================
   16. BASIC MOVE VALIDATION
   ============================================================ */

function canMovePiece(
    state,
    playerColor,
    piece,
    roll,
    destination
) {

    if (
        !state ||
        !isValidPlayer(
            playerColor
        )
    ) {

        return false;

    }


    if (!piece) {
        return false;
    }


    if (
        piece.status !==
        RULES_STATUS.ACTIVE
    ) {

        return false;

    }


    if (
        !isValidRoll(
            roll
        )
    ) {

        return false;

    }


    if (
        !isValidLogicalPosition(
            destination
        )
    ) {

        return false;

    }


    /*
     * Core-specific restriction.
     */

    if (
        !canEnterCore(
            state,
            playerColor,
            destination
        )
    ) {

        return false;

    }


    /*
     * Piece-specific roll restriction.
     */

    if (
        !canPieceUseRoll(
            piece,
            roll
        )
    ) {

        return false;

    }


    return true;

}


/* ============================================================
   17. OVERSHOOT CHECK
   ============================================================ */

function isMoveWithinRoute(
    currentIndex,
    movementDistance,
    routeLength
) {

    if (
        !Number.isInteger(
            currentIndex
        )
        ||
        !Number.isInteger(
            movementDistance
        )
        ||
        !Number.isInteger(
            routeLength
        )
    ) {

        return false;

    }


    if (
        currentIndex < 0 ||
        movementDistance < 0 ||
        routeLength < 1
    ) {

        return false;

    }


    return (
        currentIndex +
        movementDistance
        <=
        routeLength - 1
    );

}


/* ============================================================
   18. DESTINATION CHECK
   ============================================================ */

function canReachDestination(
    route,
    currentIndex,
    movementDistance
) {

    if (
        !Array.isArray(route)
    ) {

        return false;

    }


    if (
        route.length === 0
    ) {

        return false;

    }


    if (
        !Number.isInteger(
            currentIndex
        )
        ||
        !Number.isInteger(
            movementDistance
        )
    ) {

        return false;

    }


    if (
        currentIndex < 0 ||
        currentIndex >= route.length
    ) {

        return false;

    }


    if (
        movementDistance < 1
    ) {

        return false;

    }


    return isMoveWithinRoute(
        currentIndex,
        movementDistance,
        route.length
    );

}


/* ============================================================
   19. SAFE-ZONE CAPTURE RULE
   ============================================================

   Safe-zone elimination is not permitted.

   gameplay.js identifies the actual position.

   This function receives the result rather than owning
   board geometry.

   ============================================================ */

function canCaptureOnPosition(
    isSafePosition
) {

    return (
        !Boolean(
            isSafePosition
        )
    );

}


/* ============================================================
   20. CAPTURE TYPE RULE
   ============================================================

   Knight kills Knight only.

   King kills King only.

   ============================================================ */

function canPieceCapture(
    attacker,
    defender
) {

    if (
        !attacker ||
        !defender
    ) {

        return false;

    }


    if (
        !isActive(attacker) ||
        !isActive(defender)
    ) {

        return false;

    }


    if (
        isKnight(attacker) &&
        isKnight(defender)
    ) {

        return true;

    }


    if (
        isKing(attacker) &&
        isKing(defender)
    ) {

        return true;

    }


    return false;

}


/* ============================================================
   21. SAME-PLAYER CAPTURE PROTECTION
   ============================================================

   A player can never capture their own piece.

   ============================================================ */

function canCaptureOpponent(
    attackerPlayerColor,
    defenderPlayerColor
) {

    if (
        !isValidPlayer(
            attackerPlayerColor
        ) ||
        !isValidPlayer(
            defenderPlayerColor
        )
    ) {

        return false;

    }


    return (
        attackerPlayerColor !==
        defenderPlayerColor
    );

}


/* ============================================================
   22. COMPLETE CAPTURE VALIDATION
   ============================================================ */

function canCapture(
    attackerPlayerColor,
    attacker,
    defenderPlayerColor,
    defender,
    isSafePosition
) {

    if (
        !canCaptureOpponent(
            attackerPlayerColor,
            defenderPlayerColor
        )
    ) {

        return false;

    }


    if (
        !canCaptureOnPosition(
            isSafePosition
        )
    ) {

        return false;

    }


    return canPieceCapture(
        attacker,
        defender
    );

}


/* ============================================================
   23. CORE REACH VALIDATION
   ============================================================

   This helper combines:

       - valid destination
       - route overshoot
       - Core permission

   The actual route index is supplied by gameplay.js.

   ============================================================ */

function canReachLogicalDestination(
    state,
    playerColor,
    route,
    currentIndex,
    movementDistance,
    destination
) {

    if (
        !isValidPlayer(
            playerColor
        )
    ) {

        return false;

    }


    if (
        !isValidLogicalPosition(
            destination
        )
    ) {

        return false;

    }


    if (
        !canReachDestination(
            route,
            currentIndex,
            movementDistance
        )
    ) {

        return false;

    }


    return canEnterCore(
        state,
        playerColor,
        destination
    );

}


/* ============================================================
   24. INNER-AREA ENTRY HELPER
   ============================================================

   The actual player-specific inner route is owned by
   gameplay.js.

   This rule only checks the permission condition.

   A player may enter the inner area when:

       1. the player has captured an opponent
          OR
       2. all opponents have no piece remaining in
          the player's relevant area.

   The second condition is supplied by the caller because
   "player's area" is route/geometry information.

   ============================================================ */

function canEnterInnerArea(
    hasCapture,
    allOpponentsOutOfPlayerArea
) {

    return (
        Boolean(hasCapture) ||
        Boolean(allOpponentsOutOfPlayerArea)
    );

}


/* ============================================================
   25. TURN TOTAL VALIDATION
   ============================================================

   Maximum accumulated value for one turn:

       32

   ============================================================ */

function isValidTurnTotal(
    currentTotal,
    additionalValue
) {

    if (
        !Number.isInteger(
            currentTotal
        ) ||
        !Number.isInteger(
            additionalValue
        )
    ) {

        return false;

    }


    if (
        currentTotal < 0 ||
        additionalValue < 0
    ) {

        return false;

    }


    return (
        currentTotal +
        additionalValue
        <=
        32
    );

}


/* ============================================================
   26. THREE-EIGHTS CANCELLATION
   ============================================================

   8 + 8 + 8 + 3

   cancels the entire turn.

   ============================================================ */

function isTeenTigada(
    rolls
) {

    if (
        !Array.isArray(
            rolls
        )
    ) {

        return false;

    }


    if (
        rolls.length < 4
    ) {

        return false;

    }


    const lastFour =
        rolls.slice(
            -4
        );


    return (
        lastFour[0] === 8 &&
        lastFour[1] === 8 &&
        lastFour[2] === 8 &&
        lastFour[3] === 3
    );

}


/* ============================================================
   27. SPLIT VALIDATION
   ============================================================ */

function canUseSplitChunk(
    originalRoll,
    chunk
) {

    if (
        !canSplitRoll(
            originalRoll
        )
    ) {

        return false;

    }


    return (
        chunk === 4
    );

}


/* ============================================================
   28. NO-WASTE VALIDATION
   ============================================================

   A turn cannot be completed by silently throwing away
   an unusable remainder.

   ============================================================ */

function canFullyAssignScore(
    remainingScore,
    legalAssignments
) {

    if (
        !Number.isInteger(
            remainingScore
        ) ||
        remainingScore < 0
    ) {

        return false;

    }


    if (
        remainingScore === 0
    ) {

        return true;

    }


    if (
        !Array.isArray(
            legalAssignments
        )
    ) {

        return false;

    }


    /*
     * Each assignment represents a legal chunk that can
     * consume part of the remaining score.
     *
     * This small dynamic-programming implementation prevents
     * an unusable remainder from being silently discarded.
     */

    const reachable =
        new Set([
            0
        ]);


    for (
        const value of legalAssignments
    ) {

        if (
            !Number.isInteger(value) ||
            value <= 0
        ) {

            continue;

        }


        const previous =
            Array.from(
                reachable
            );


        for (
            const total of previous
        ) {

            const next =
                total + value;


            if (
                next <=
                remainingScore
            ) {

                reachable.add(
                    next
                );

            }

        }

    }


    return reachable.has(
        remainingScore
    );

}


/* ============================================================
   29. PUBLIC API
   ============================================================ */

window.AstaChammaRules = Object.freeze({

    /* Constants */
    PLAYERS:
        RULES_PLAYERS,

    PIECE_TYPES:
        RULES_PIECE_TYPES,

    STATUS:
        RULES_STATUS,

    CORE_POSITION:
        RULES_CORE_POSITION,

    /* Validation */
    isValidPlayer,
    isValidPieceType,
    isValidStatus,
    isValidRoll,

    /* Piece type */
    isKnight,
    isKing,

    /* Piece status */
    isNeverActivated,
    isInactive,
    isActive,

    /* Movement */
    canKingUseRoll,
    canKnightUseRoll,
    getMovementDistance,
    canPieceUseRoll,
    canMovePiece,

    /* Split */
    canSplitRoll,
    getSplitRoll,
    canUseSplitChunk,

    /* Initial entry */
    getInitialEntryCapacity,
    canInitialActivatePiece,

    /* Comeback */
    getComebackRoll,
    canPieceComeback,

    /* Positions */
    isRoutePosition,
    isCorePosition,
    isValidLogicalPosition,
    isMoveWithinRoute,
    canReachDestination,
    canReachLogicalDestination,

    /* Core */
    hasCapturePermission,
    areAllOpponentsInCore,
    canPlayerEnterCore,
    canEnterCore,

    /* Inner area */
    canEnterInnerArea,

    /* Capture */
    canCaptureOnPosition,
    canPieceCapture,
    canCaptureOpponent,
    canCapture,

    /* Turn rules */
    isValidTurnTotal,
    isTeenTigada,
    canFullyAssignScore

});