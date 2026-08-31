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

    return roll === 8;

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
           all pieces may initially enter.

   This function only determines the capacity.

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

   If no opponent pieces remain outside Core,
   Core entry is allowed.

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
         * An opponent piece is outside Core if:
         *
         * - it is active and not in Core
         * - or it has never been activated
         * - or it is inactive/captured
         *
         * Therefore, simply checking corePieces is not enough.
         *
         * A piece is considered remaining outside Core if
         * it has not reached Core.
         */

        const outsideCore =
            opponent.pieces.some(
                piece =>
                    !(
                        piece.status ===
                            RULES_STATUS.ACTIVE
                        &&
                        piece.position ===
                            RULES_CORE_POSITION
                    )
            );


        if (
            outsideCore
        ) {

            return false;

        }

    }


    return true;

}


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
   13. CORE MOVE PERMISSION
   ============================================================

   The actual route calculation is handled by gameplay.js.

   This function only checks the special Core requirement.

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
   14. BASIC MOVE VALIDATION
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
   15. OVERSHOOT CHECK
   ============================================================

   The route engine supplies the actual logical route.

   This generic helper prevents a move from exceeding
   the requested route destination.

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
   16. DESTINATION CHECK
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
   17. SAFE-ZONE CAPTURE RULE
   ============================================================

   Safe-zone elimination is not permitted.

   gameplay.js may identify safe positions.

   This rule helper accepts that information rather than
   hard-coding physical board coordinates here.

   ============================================================ */

function canCaptureOnPosition(
    isSafePosition
) {

    /*
     * Safe position:
     * capture is prohibited.
     */

    if (
        isSafePosition === true
    ) {

        return false;

    }


    return true;

}


/* ============================================================
   18. SAME-CELL / OCCUPANCY RULE
   ============================================================

   Normal route positions:
       Two pieces may not occupy the same square.

   Base / Safe positions:
       handled by gameplay/core occupancy logic.

   Core:
       pieces reaching Core are removed from the board.

   ============================================================ */

function canSharePosition(
    position,
    isBase,
    isSafe,
    isCore
) {

    /*
     * Core is not an ordinary board square.
     */

    if (
        isCore === true
    ) {

        return false;

    }


    /*
     * Base and Safe are allowed to contain multiple pieces.
     */

    if (
        isBase === true ||
        isSafe === true
    ) {

        return true;

    }


    /*
     * Normal route square.
     */

    return false;

}


/* ============================================================
   19. CAPTURE COMPATIBILITY
   ============================================================

   Original game rule:

       Knight kills Knight.
       King kills King.

   Therefore:

       Knight × Knight → allowed
       Knight × King   → prohibited
       King × Knight   → prohibited
       King × King     → allowed

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


    /*
     * Same type only.
     */

    return (
        attacker.type ===
        defender.type
    );

}


/* ============================================================
   20. PLAYER CANNOT CAPTURE SELF
   ============================================================ */

function canCaptureOpponent(
    attackerPlayerColor,
    defenderPlayerColor
) {

    if (
        !isValidPlayer(
            attackerPlayerColor
        )
        ||
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
   21. COMBINED CAPTURE VALIDATION
   ============================================================ */

function canCapture(
    attackerPlayerColor,
    attacker,
    defenderPlayerColor,
    defender,
    isSafePosition = false
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
   22. INITIAL ENTRY POSITION
   ============================================================

   The actual physical board location of a player's starting
   point belongs to gameplay.js.

   State stores logical position.

   This helper merely verifies that an entry position is valid.

   ============================================================ */

function isValidEntryPosition(
    position
) {

    return isRoutePosition(
        position
    );

}


/* ============================================================
   23. VICTORY
   ============================================================ */

function hasPlayerWon(
    player
) {

    if (!player) {
        return false;
    }


    if (
        !Array.isArray(
            player.pieces
        )
    ) {

        return false;

    }


    /*
     * All four pieces must actually be in Core.
     */

    return (
        player.pieces.length > 0
        &&
        player.pieces.every(
            piece =>
                piece.status ===
                    RULES_STATUS.ACTIVE
                &&
                piece.position ===
                    RULES_CORE_POSITION
        )
    );

}


/* ============================================================
   24. GAME OVER
   ============================================================ */

function getWinner(
    state
) {

    if (
        !state ||
        !state.players
    ) {

        return null;

    }


    for (
        const color of RULES_PLAYERS
    ) {

        if (
            hasPlayerWon(
                state.players[color]
            )
        ) {

            return color;

        }

    }


    return null;

}


function isGameOver(
    state
) {

    return (
        getWinner(
            state
        ) !== null
    );

}


/* ============================================================
   25. ROLL ASSIGNMENT
   ============================================================

   Determines whether a roll can be assigned to a piece.

   This does not execute the movement.

   ============================================================ */

function canAssignRollToPiece(
    piece,
    roll
) {

    if (
        !piece ||
        !isValidRoll(roll)
    ) {

        return false;

    }


    /*
     * Never-activated pieces are handled by the initial
     * activation rule rather than normal movement.
     */

    if (
        isNeverActivated(
            piece
        )
    ) {

        return canInitialActivatePiece(
            piece,
            roll
        );

    }


    /*
     * Captured pieces are handled by comeback rule.

     */

    if (
        isInactive(
            piece
        )
    ) {

        return canPieceComeback(
            piece,
            roll
        );

    }


    /*
     * Active pieces use movement rules.
     */

    return canPieceUseRoll(
        piece,
        roll
    );

}


/* ============================================================
   26. GET LEGAL ACTION TYPE
   ============================================================ */

function getPieceActionType(
    piece,
    roll
) {

    if (
        !piece ||
        !isValidRoll(
            roll
        )
    ) {

        return null;

    }


    if (
        isNeverActivated(
            piece
        )
    ) {

        if (
            canInitialActivatePiece(
                piece,
                roll
            )
        ) {

            return "initial-entry";

        }

        return null;

    }


    if (
        isInactive(
            piece
        )
    ) {

        if (
            canPieceComeback(
                piece,
                roll
            )
        ) {

            return "comeback";

        }

        return null;

    }


    if (
        isActive(
            piece
        )
    ) {

        if (
            canPieceUseRoll(
                piece,
                roll
            )
        ) {

            return "move";

        }

    }


    return null;

}


/* ============================================================
   27. GET LEGAL PIECES
   ============================================================ */

function getLegalPieces(
    player,
    roll
) {

    if (
        !player ||
        !Array.isArray(
            player.pieces
        )
        ||
        !isValidRoll(
            roll
        )
    ) {

        return [];

    }


    return player.pieces.filter(
        piece =>
            canAssignRollToPiece(
                piece,
                roll
            )
    );

}


/* ============================================================
   28. GET MOVEMENT INFORMATION
   ============================================================ */

function getMoveInformation(
    piece,
    roll
) {

    if (
        !piece ||
        !isValidRoll(
            roll
        )
    ) {

        return null;

    }


    const action =
        getPieceActionType(
            piece,
            roll
        );


    if (!action) {

        return null;

    }


    return {

        pieceId:
            piece.id,

        pieceType:
            piece.type,

        roll,

        action,

        movementDistance:
            action === "move"
                ? getMovementDistance(
                    piece,
                    roll
                )
                : 0

    };

}


/* ============================================================
   29. COMPLETE MOVE VALIDATION
   ============================================================ */

function validateMove(
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

        return {

            valid: false,

            reason:
                "Invalid game state or player."

        };

    }


    if (!piece) {

        return {

            valid: false,

            reason:
                "Piece does not exist."

        };

    }


    if (
        !isValidRoll(
            roll
        )
    ) {

        return {

            valid: false,

            reason:
                "Invalid roll."

        };

    }


    if (
        !isValidLogicalPosition(
            destination
        )
    ) {

        return {

            valid: false,

            reason:
                "Invalid destination."

        };

    }


    if (
        !isActive(
            piece
        )
    ) {

        return {

            valid: false,

            reason:
                "Piece is not active."

        };

    }


    if (
        !canPieceUseRoll(
            piece,
            roll
        )
    ) {

        return {

            valid: false,

            reason:
                piece.type ===
                    RULES_PIECE_TYPES.KING
                    ? "King can only use even rolls."
                    : "Piece cannot use this roll."

        };

    }


    if (
        !canEnterCore(
            state,
            playerColor,
            destination
        )
    ) {

        return {

            valid: false,

            reason:
                "Core entry is not permitted yet."

        };

    }


    return {

        valid: true,

        reason: null,

        distance:
            getMovementDistance(
                piece,
                roll
            )

    };

}


/* ============================================================
   30. PUBLIC API
   ============================================================ */

window.AstaChammaRules =
    Object.freeze({

        PLAYERS:
            RULES_PLAYERS,

        PIECE_TYPES:
            RULES_PIECE_TYPES,

        PIECE_STATUS:
            RULES_STATUS,

        CORE_POSITION:
            RULES_CORE_POSITION,


        isValidPlayer,

        isValidPieceType,

        isValidStatus,

        isValidRoll,


        isKnight,

        isKing,


        isNeverActivated,

        isInactive,

        isActive,


        canKnightUseRoll,

        canKingUseRoll,

        getMovementDistance,

        canPieceUseRoll,


        canSplitRoll,

        getSplitRoll,


        getInitialEntryCapacity,

        canInitialActivatePiece,


        getComebackRoll,

        canPieceComeback,


        isRoutePosition,

        isCorePosition,

        isValidLogicalPosition,


        hasCapturePermission,

        areAllOpponentsInCore,

        canPlayerEnterCore,

        canEnterCore,


        canMovePiece,

        isMoveWithinRoute,

        canReachDestination,


        canCaptureOnPosition,

        canSharePosition,


        canPieceCapture,

        canCaptureOpponent,

        canCapture,


        isValidEntryPosition,


        hasPlayerWon,

        getWinner,

        isGameOver,


        canAssignRollToPiece,

        getPieceActionType,

        getLegalPieces,

        getMoveInformation,

        validateMove

    });