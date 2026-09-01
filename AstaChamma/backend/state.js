/* ============================================================
   ASTACHAMMA — GAME STATE
   ============================================================

   Piece status:
       -1 = never activated during current game
        0 = inactive / captured
        1 = active / on board

   Logical position:
       1  → 24 = numbered route
       25      = CORE

   Important:
   - Logical routes are player-specific.
   - Physical board positions are handled by gameplay.js.
   - Capture count is PLAYER-WISE.
   - Initial activation and comeback are different actions.
   - State owns DATA.
   - Rules / Gameplay / Core own GAME LOGIC.
   ============================================================ */


/* ============================================================
   1. CONSTANTS
   ============================================================ */

const PLAYERS = Object.freeze([
    "red",
    "blue",
    "green",
    "yellow"
]);


const PIECE_TYPES = Object.freeze([
    "knight",
    "knight",
    "knight",
    "king"
]);


const PIECE_STATUS = Object.freeze({
    NEVER_ACTIVATED: -1,
    INACTIVE: 0,
    ACTIVE: 1
});


const CORE_POSITION = 25;

const PIECES_PER_PLAYER = 4;

const MIN_ROUTE_POSITION = 1;

const MAX_ROUTE_POSITION = 24;


/* ============================================================
   2. INTERNAL VALIDATION HELPERS
   ============================================================ */

function isValidPlayerColor(color) {

    return PLAYERS.includes(
        color
    );

}


function isValidPieceType(type) {

    return (
        type === "knight" ||
        type === "king"
    );

}


function isValidStatus(status) {

    return (
        status ===
            PIECE_STATUS.NEVER_ACTIVATED
        ||
        status ===
            PIECE_STATUS.INACTIVE
        ||
        status ===
            PIECE_STATUS.ACTIVE
    );

}


function isValidLogicalPosition(position) {

    return (
        Number.isInteger(position)
        &&
        (
            (
                position >=
                    MIN_ROUTE_POSITION
                &&
                position <=
                    MAX_ROUTE_POSITION
            )
            ||
            position ===
                CORE_POSITION
        )
    );

}


/*
 * A piece has no board position while it is inactive
 * or has never been activated.
 *
 * An active piece must have a valid logical position.
 */
function isValidPositionForStatus(
    status,
    position
) {

    if (
        status ===
            PIECE_STATUS.NEVER_ACTIVATED
        ||
        status ===
            PIECE_STATUS.INACTIVE
    ) {

        return (
            position === null
        );

    }


    if (
        status ===
            PIECE_STATUS.ACTIVE
    ) {

        return isValidLogicalPosition(
            position
        );

    }


    return false;

}


/* ============================================================
   3. CREATE PIECE
   ============================================================ */

function createPiece(
    id,
    type
) {

    if (
        !id ||
        !isValidPieceType(type)
    ) {

        return null;

    }


    return {

        id,

        type,

        /*
         * -1 = never entered
         *  0 = captured / inactive
         *  1 = active
         */
        status:
            PIECE_STATUS.NEVER_ACTIVATED,

        /*
         * Position has meaning only when active.
         *
         * 1..24 = numbered route
         * 25    = Core
         */
        position:
            null

    };

}


/* ============================================================
   4. CREATE PLAYER
   ============================================================ */

function createPlayer(
    color
) {

    if (
        !isValidPlayerColor(
            color
        )
    ) {

        return null;

    }


    const pieces = [];


    for (
        let index = 0;
        index < PIECES_PER_PLAYER;
        index++
    ) {

        const piece =
            createPiece(
                `${color}-${index + 1}`,
                PIECE_TYPES[index]
            );


        if (
            !piece
        ) {

            return null;

        }


        pieces.push(
            piece
        );

    }


    return {

        color,

        pieces,

        /*
         * Number of opponent pieces captured by this player.
         *
         * IMPORTANT:
         * This is player-wise, not piece-wise.
         *
         * Once this becomes >= 1, the player has satisfied
         * the capture requirement for Core entry.
         */
        captures:
            0,

        /*
         * Number of pieces that have reached Core.
         */
        corePieces:
            0

    };

}


/* ============================================================
   5. CREATE PLAYERS OBJECT
   ============================================================ */

function createPlayers() {

    const players = {};


    for (
        const color of PLAYERS
    ) {

        players[color] =
            createPlayer(
                color
            );

    }


    return players;

}


/* ============================================================
   6. CREATE INITIAL GAME STATE
   ============================================================ */

function createInitialState() {

    return {

        /*
         * Game status
         */
        started:
            false,

        gameOver:
            false,

        /*
         * Active players.
         *
         * Core may use 2, 3, or 4 players.
         *
         * Four canonical player objects are still retained
         * so the existing state model remains compatible.
         */
        activePlayers:
            [
                ...PLAYERS
            ],

        /*
         * Turn
         */
        currentPlayer:
            PLAYERS[0],

        turnIndex:
            0,

        /*
         * Roll
         */
        hasRolled:
            false,

        lastRoll:
            null,

        lastCoins:
            [],

        /*
         * Number of never-activated pieces entered using
         * the current roll.
         *
         * Initial entry is limited per roll:
         *
         *     4 -> maximum 2 pieces
         *     8 -> maximum 4 pieces
         */
        initialEntriesThisRoll:
            0,

        /*
         * Piece selection
         */
        selectedPieceId:
            null,

        availableMoves:
            [],

        /*
         * Split
         *
         * Only 8 can create:
         *
         *     4 + 4
         */
        splitAvailable:
            false,

        splitUsed:
            false,

        splitMoves:
            [],

        /*
         * Players
         */
        players:
            createPlayers()

    };

}


/* ============================================================
   7. PRIVATE CURRENT STATE
   ============================================================ */

let gameState =
    createInitialState();


/* ============================================================
   8. GET STATE
   ============================================================ */

function getGameState() {

    return gameState;

}


/* ============================================================
   9. RESET STATE
   ============================================================ */

function resetGameState() {

    gameState =
        createInitialState();

    return gameState;

}


/* ============================================================
   10. GET PLAYER
   ============================================================ */

function getPlayer(
    color
) {

    if (
        !isValidPlayerColor(
            color
        )
    ) {

        return null;

    }


    return (
        gameState.players[color]
        ||
        null
    );

}


/* ============================================================
   11. GET PIECE
   ============================================================ */

function getPiece(
    playerColor,
    pieceId
) {

    const player =
        getPlayer(
            playerColor
        );


    if (
        !player ||
        !pieceId
    ) {

        return null;

    }


    return (
        player.pieces.find(
            piece =>
                piece.id ===
                pieceId
        )
        ||
        null
    );

}


/* ============================================================
   12. ACTIVATE PIECE
   ============================================================

   Used for:
       - initial entry
       - comeback after capture

   Valid transitions:

       -1 → 1
        0 → 1

   Invalid:

        1 → 1

   Position must be a valid logical position.
   ============================================================ */

function activatePiece(
    playerColor,
    pieceId,
    position = 1
) {

    const piece =
        getPiece(
            playerColor,
            pieceId
        );


    if (
        !piece
    ) {

        return false;

    }


    /*
     * Do not silently re-activate an already active piece.
     */
    if (
        piece.status ===
            PIECE_STATUS.ACTIVE
    ) {

        return false;

    }


    /*
     * An activated piece must receive a valid board position.
     */
    if (
        !isValidLogicalPosition(
            position
        )
    ) {

        return false;

    }


    /*
     * Only -1 and 0 may become active.
     */
    if (
        piece.status !==
            PIECE_STATUS.NEVER_ACTIVATED
        &&
        piece.status !==
            PIECE_STATUS.INACTIVE
    ) {

        return false;

    }


    piece.status =
        PIECE_STATUS.ACTIVE;

    piece.position =
        position;


    return true;

}


/* ============================================================
   13. CAPTURE PIECE
   ============================================================

   Captured piece becomes:

       status = 0
       position = null

   It does NOT return to -1.

   This distinction is fundamental:

       -1 = never activated
        0 = previously active but now captured
   ============================================================ */

function capturePiece(
    playerColor,
    pieceId
) {

    const piece =
        getPiece(
            playerColor,
            pieceId
        );


    if (
        !piece
    ) {

        return false;

    }


    /*
     * Only an active piece can be captured.
     */
    if (
        piece.status !==
            PIECE_STATUS.ACTIVE
    ) {

        return false;

    }


    piece.status =
        PIECE_STATUS.INACTIVE;

    piece.position =
        null;


    return true;

}


/* ============================================================
   14. SET PIECE POSITION
   ============================================================ */

function setPiecePosition(
    playerColor,
    pieceId,
    position
) {

    const piece =
        getPiece(
            playerColor,
            pieceId
        );


    if (
        !piece
    ) {

        return false;

    }


    /*
     * Only active pieces may have a board position.
     */
    if (
        piece.status !==
            PIECE_STATUS.ACTIVE
    ) {

        return false;

    }


    if (
        !isValidLogicalPosition(
            position
        )
    ) {

        return false;

    }


    piece.position =
        position;


    return true;

}


/* ============================================================
   15. RECORD CAPTURE
   ============================================================

   Player-wise capture tracking.

   We keep the exact count for statistics while Core-entry
   legality only needs to know whether captures >= 1.
   ============================================================ */

function addCapture(
    playerColor,
    amount = 1
) {

    const player =
        getPlayer(
            playerColor
        );


    if (
        !player
    ) {

        return false;

    }


    if (
        !Number.isInteger(
            amount
        )
        ||
        amount < 1
    ) {

        return false;

    }


    player.captures +=
        amount;


    return true;

}


/* ============================================================
   16. MARK CORE REACHED
   ============================================================

   A piece must already be active and physically/logically
   positioned at Core before the Core counter can increase.

   The piece remains ACTIVE at position 25.

   This prevents the Core counter from becoming detached
   from actual piece state.
   ============================================================ */

function markCoreReached(
    playerColor,
    pieceId = null
) {

    const player =
        getPlayer(
            playerColor
        );


    if (
        !player
    ) {

        return false;

    }


    let piece = null;


    /*
     * Preferred form:
     *
     *     markCoreReached(color, pieceId)
     *
     * This gives us exact piece accounting.
     */
    if (
        pieceId !== null
    ) {

        piece =
            getPiece(
                playerColor,
                pieceId
            );


        if (
            !piece
        ) {

            return false;

        }


        if (
            piece.status !==
                PIECE_STATUS.ACTIVE
            ||
            piece.position !==
                CORE_POSITION
        ) {

            return false;

        }


        /*
         * Prevent counting the same Core piece twice.
         *
         * Core pieces are represented by position 25.
         * Once counted, the player counter should match
         * the number of pieces currently at Core.
         */
        const actualCoreCount =
            countCorePieces(
                playerColor
            );


        if (
            player.corePieces >=
            actualCoreCount
        ) {

            /*
             * If the counter already equals the number of
             * pieces actually in Core, no new Core piece can
             * legitimately be counted through this call.
             */
            if (
                player.corePieces ===
                actualCoreCount
            ) {

                /*
                 * Count this piece only when it is not already
                 * represented by the counter.
                 *
                 * Since there is no separate counted flag in
                 * the original state model, derive the count
                 * from the number of Core pieces.
                 */
                if (
                    player.corePieces >=
                    PIECES_PER_PLAYER
                ) {

                    return false;

                }

            }

        }

    } else {

        /*
         * Backward-compatible form:
         *
         *     markCoreReached(color)
         *
         * Only permit the counter to match actual Core pieces.
         */
        const actualCoreCount =
            countCorePieces(
                playerColor
            );


        if (
            actualCoreCount <=
            player.corePieces
        ) {

            return false;

        }


        player.corePieces =
            actualCoreCount;


        return true;

    }


    /*
     * Exact-piece form.
     *
     * Recalculate from actual state rather than allowing an
     * arbitrary increment.
     */
    const coreCount =
        countCorePieces(
            playerColor
        );


    if (
        coreCount <=
        player.corePieces
    ) {

        return false;

    }


    player.corePieces =
        coreCount;


    return true;

}


/* ============================================================
   17. SYNCHRONIZE CORE COUNT
   ============================================================

   Useful after state restoration or when Core has directly
   moved a piece to position 25.

   This does not invent Core pieces; it derives the count
   from the actual piece positions.
   ============================================================ */

function syncCorePieces(
    playerColor
) {

    const player =
        getPlayer(
            playerColor
        );


    if (
        !player
    ) {

        return false;

    }


    player.corePieces =
        countCorePieces(
            playerColor
        );


    return true;

}


/* ============================================================
   18. COUNT PLAYER PIECES
   ============================================================ */

function countPieces(
    playerColor,
    status
) {

    const player =
        getPlayer(
            playerColor
        );


    if (
        !player ||
        !isValidStatus(
            status
        )
    ) {

        return 0;

    }


    return player.pieces.filter(
        piece =>
            piece.status ===
            status
    ).length;

}


function countActivePieces(
    playerColor
) {

    return countPieces(
        playerColor,
        PIECE_STATUS.ACTIVE
    );

}


function countInactivePieces(
    playerColor
) {

    return countPieces(
        playerColor,
        PIECE_STATUS.INACTIVE
    );

}


function countNeverActivatedPieces(
    playerColor
) {

    return countPieces(
        playerColor,
        PIECE_STATUS.NEVER_ACTIVATED
    );

}


/* ============================================================
   19. COUNT PIECES IN CORE
   ============================================================ */

function countCorePieces(
    playerColor
) {

    const player =
        getPlayer(
            playerColor
        );


    if (
        !player
    ) {

        return 0;

    }


    return player.pieces.filter(
        piece =>
            piece.status ===
                PIECE_STATUS.ACTIVE
            &&
            piece.position ===
                CORE_POSITION
    ).length;

}


/* ============================================================
   20. SET ACTIVE PLAYERS
   ============================================================

   Supports:
       2 players
       3 players
       4 players

   Core can use this instead of maintaining a completely
   separate source of truth.
   ============================================================ */

function setActivePlayers(
    colors
) {

    if (
        !Array.isArray(
            colors
        )
    ) {

        return false;

    }


    if (
        colors.length < 2 ||
        colors.length > 4
    ) {

        return false;

    }


    /*
     * Remove duplicates while preserving order.
     */
    const unique =
        [
            ...new Set(
                colors
            )
        ];


    if (
        unique.length !==
        colors.length
    ) {

        return false;

    }


    if (
        unique.some(
            color =>
                !isValidPlayerColor(
                    color
                )
        )
    ) {

        return false;

    }


    gameState.activePlayers =
        [
            ...unique
        ];


    /*
     * Keep current player valid.
     */
    if (
        !gameState.activePlayers.includes(
            gameState.currentPlayer
        )
    ) {

        gameState.turnIndex =
            0;

        gameState.currentPlayer =
            gameState.activePlayers[0];

    } else {

        gameState.turnIndex =
            gameState.activePlayers.indexOf(
                gameState.currentPlayer
            );

    }


    return true;

}


function getActivePlayers() {

    return [
        ...gameState.activePlayers
    ];

}


/* ============================================================
   21. TURN RESET
   ============================================================

   Resets state-level turn information.

   Core maintains its richer turnState separately.
   ============================================================ */

function resetTurnData() {

    gameState.hasRolled =
        false;

    gameState.lastRoll =
        null;

    gameState.lastCoins =
        [];

    gameState.initialEntriesThisRoll =
        0;

    gameState.selectedPieceId =
        null;

    gameState.availableMoves =
        [];

    gameState.splitAvailable =
        false;

    gameState.splitUsed =
        false;

    gameState.splitMoves =
        [];

}


/* ============================================================
   22. TURN CONTROL
   ============================================================ */

function advanceTurn() {

    const active =
        gameState.activePlayers;


    if (
        !Array.isArray(active) ||
        active.length === 0
    ) {

        return null;

    }


    const currentIndex =
        active.indexOf(
            gameState.currentPlayer
        );


    let nextIndex;


    if (
        currentIndex === -1
    ) {

        nextIndex =
            0;

    } else {

        nextIndex =
            (
                currentIndex + 1
            )
            %
            active.length;

    }


    gameState.turnIndex =
        nextIndex;

    gameState.currentPlayer =
        active[
            nextIndex
        ];


    resetTurnData();


    return gameState.currentPlayer;

}


/* ============================================================
   23. SET CURRENT PLAYER
   ============================================================ */

function setCurrentPlayer(
    color
) {

    if (
        !isValidPlayerColor(
            color
        )
    ) {

        return false;

    }


    const index =
        gameState.activePlayers.indexOf(
            color
        );


    /*
     * A player outside the active-player set should not become
     * the current player during a normal game.
     */
    if (
        index === -1
    ) {

        return false;

    }


    gameState.turnIndex =
        index;

    gameState.currentPlayer =
        color;


    return true;

}


/* ============================================================
   24. SET GAME STARTED
   ============================================================ */

function setGameStarted(
    value = true
) {

    gameState.started =
        Boolean(
            value
        );


    return gameState.started;

}


/* ============================================================
   25. SET GAME OVER
   ============================================================ */

function setGameOver(
    value = true
) {

    gameState.gameOver =
        Boolean(
            value
        );


    return gameState.gameOver;

}


/* ============================================================
   26. VALIDATE STATE
   ============================================================

   Development/debug helper.

   It does not mutate state.

   Returns:
       {
           valid: true/false,
           errors: [...]
       }
   ============================================================ */

function validateState() {

    const errors = [];


    /*
     * Current player
     */
    if (
        !isValidPlayerColor(
            gameState.currentPlayer
        )
    ) {

        errors.push(
            "Invalid currentPlayer."
        );

    }


    /*
     * Turn index
     */
    if (
        !Number.isInteger(
            gameState.turnIndex
        )
        ||
        gameState.turnIndex < 0
        ||
        gameState.turnIndex >=
            gameState.activePlayers.length
    ) {

        errors.push(
            "Invalid turnIndex."
        );

    }


    /*
     * Active players
     */
    if (
        !Array.isArray(
            gameState.activePlayers
        )
        ||
        gameState.activePlayers.length < 2
        ||
        gameState.activePlayers.length > 4
    ) {

        errors.push(
            "Invalid activePlayers."
        );

    }


    /*
     * Player validation
     */
    for (
        const color of PLAYERS
    ) {

        const player =
            gameState.players[color];


        if (
            !player
        ) {

            errors.push(
                `Missing player: ${color}.`
            );

            continue;

        }


        if (
            !Array.isArray(
                player.pieces
            )
            ||
            player.pieces.length !==
                PIECES_PER_PLAYER
        ) {

            errors.push(
                `${color}: invalid piece count.`
            );

            continue;

        }


        if (
            !Number.isInteger(
                player.captures
            )
            ||
            player.captures < 0
        ) {

            errors.push(
                `${color}: invalid capture count.`
            );

        }


        if (
            !Number.isInteger(
                player.corePieces
            )
            ||
            player.corePieces < 0
            ||
            player.corePieces >
                PIECES_PER_PLAYER
        ) {

            errors.push(
                `${color}: invalid corePieces count.`
            );

        }


        /*
         * Piece validation
         */
        for (
            const piece of player.pieces
        ) {

            if (
                !piece ||
                !piece.id ||
                !isValidPieceType(
                    piece.type
                )
            ) {

                errors.push(
                    `${color}: invalid piece definition.`
                );

                continue;

            }


            if (
                !isValidStatus(
                    piece.status
                )
            ) {

                errors.push(
                    `${piece.id}: invalid status.`
                );

                continue;

            }


            if (
                !isValidPositionForStatus(
                    piece.status,
                    piece.position
                )
            ) {

                errors.push(
                    `${piece.id}: invalid status/position combination.`
                );

            }

        }


        /*
         * Core counter must agree with actual pieces.
         */
        const actualCore =
            countCorePieces(
                color
            );


        if (
            player.corePieces !==
            actualCore
        ) {

            errors.push(
                `${color}: corePieces does not match actual Core pieces.`
            );

        }

    }


    /*
     * Current player must belong to active players.
     */
    if (
        !gameState.activePlayers.includes(
            gameState.currentPlayer
        )
    ) {

        errors.push(
            "Current player is not an active player."
        );

    }


    return {

        valid:
            errors.length === 0,

        errors

    };

}


/* ============================================================
   27. PUBLIC API
   ============================================================ */

window.AstaChammaState =
    Object.freeze({

        /*
         * Constants
         */
        PLAYERS,

        PIECE_TYPES,

        PIECE_STATUS,

        CORE_POSITION,

        PIECES_PER_PLAYER,

        MIN_ROUTE_POSITION,

        MAX_ROUTE_POSITION,


        /*
         * State
         */
        getGameState,

        resetGameState,


        /*
         * Players / pieces
         */
        getPlayer,

        getPiece,


        /*
         * Piece mutation
         */
        activatePiece,

        capturePiece,

        setPiecePosition,


        /*
         * Capture / Core
         */
        addCapture,

        markCoreReached,

        syncCorePieces,


        /*
         * Counts
         */
        countPieces,

        countActivePieces,

        countInactivePieces,

        countNeverActivatedPieces,

        countCorePieces,


        /*
         * Active-player management
         */
        setActivePlayers,

        getActivePlayers,


        /*
         * Turn
         */
        advanceTurn,

        setCurrentPlayer,

        resetTurnData,


        /*
         * Game status
         */
        setGameStarted,

        setGameOver,


        /*
         * Development validation
         */
        validateState

    });