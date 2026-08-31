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


/* ============================================================
   2. CREATE PIECE
   ============================================================ */

function createPiece(id, type) {

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
         * 1..24 = route
         * 25    = Core
         */
        position: null
    };

}


/* ============================================================
   3. CREATE PLAYER
   ============================================================ */

function createPlayer(color) {

    return {

        color,

        pieces: [
            createPiece(
                `${color}-1`,
                PIECE_TYPES[0]
            ),

            createPiece(
                `${color}-2`,
                PIECE_TYPES[1]
            ),

            createPiece(
                `${color}-3`,
                PIECE_TYPES[2]
            ),

            createPiece(
                `${color}-4`,
                PIECE_TYPES[3]
            )
        ],

        /*
         * Number of opponent pieces captured by this player.
         *
         * IMPORTANT:
         * This is player-wise, not piece-wise.
         *
         * Once this becomes >= 1, the player has satisfied
         * the capture requirement for Core entry.
         */
        captures: 0,

        /*
         * Number of pieces that have reached Core.
         */
        corePieces: 0

    };

}


/* ============================================================
   4. CREATE INITIAL GAME STATE
   ============================================================ */

function createInitialState() {

    return {

        /*
         * Game status
         */
        started: false,
        gameOver: false,

        /*
         * Turn
         */
        currentPlayer: PLAYERS[0],
        turnIndex: 0,

        /*
         * Roll
         */
        hasRolled: false,
        lastRoll: null,
        lastCoins: [],

        /*
         * Number of never-activated pieces entered using the
         * current roll. Initial entry is limited per roll:
         *
         *     4 -> 2 pieces
         *     8 -> 4 pieces
         */
        initialEntriesThisRoll: 0,

        /*
         * Piece selection
         */
        selectedPieceId: null,
        availableMoves: [],

        /*
         * Split
         *
         * Only 8 can create:
         *
         *      4 + 4
         */
        splitAvailable: false,
        splitUsed: false,
        splitMoves: [],

        /*
         * Players
         */
        players: {

            red:
                createPlayer("red"),

            blue:
                createPlayer("blue"),

            green:
                createPlayer("green"),

            yellow:
                createPlayer("yellow")

        }

    };

}


/* ============================================================
   5. PRIVATE CURRENT STATE
   ============================================================ */

let gameState =
    createInitialState();


/* ============================================================
   6. GET STATE
   ============================================================ */

function getGameState() {

    return gameState;

}


/* ============================================================
   7. RESET STATE
   ============================================================ */

function resetGameState() {

    gameState =
        createInitialState();

    return gameState;

}


/* ============================================================
   8. GET PLAYER
   ============================================================ */

function getPlayer(color) {

    if (!PLAYERS.includes(color)) {
        return null;
    }

    return gameState.players[color];

}


/* ============================================================
   9. GET PIECE
   ============================================================ */

function getPiece(
    playerColor,
    pieceId
) {

    const player =
        getPlayer(playerColor);

    if (!player) {
        return null;
    }

    return (
        player.pieces.find(
            piece =>
                piece.id === pieceId
        )
        || null
    );

}


/* ============================================================
   10. ACTIVATE PIECE
   ============================================================

   Used for:
   - initial entry
   - comeback after capture

   status:
       -1 → 1
       0  → 1
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

    if (!piece) {
        return false;
    }

    piece.status =
        PIECE_STATUS.ACTIVE;

    piece.position =
        position;

    return true;

}


/* ============================================================
   11. CAPTURE PIECE
   ============================================================

   Captured piece becomes:

       status = 0
       position = null

   It does NOT return to -1.

   This distinction is important because:
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

    if (!piece) {
        return false;
    }

    piece.status =
        PIECE_STATUS.INACTIVE;

    piece.position =
        null;

    return true;

}


/* ============================================================
   12. SET PIECE POSITION
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

    if (!piece) {
        return false;
    }

    if (
        piece.status !==
        PIECE_STATUS.ACTIVE
    ) {
        return false;
    }

    piece.position =
        position;

    return true;

}


/* ============================================================
   13. RECORD CAPTURE
   ============================================================

   Player-wise capture tracking.

   We only need to know whether:

       captures > 0

   for the Core-entry rule.

   Still keep the exact count for statistics.
   ============================================================ */

function addCapture(
    playerColor,
    amount = 1
) {

    const player =
        getPlayer(playerColor);

    if (!player) {
        return false;
    }

    if (
        !Number.isInteger(amount) ||
        amount < 1
    ) {
        return false;
    }

    player.captures += amount;

    return true;

}


/* ============================================================
   14. MARK CORE REACHED
   ============================================================ */

function markCoreReached(
    playerColor
) {

    const player =
        getPlayer(playerColor);

    if (!player) {
        return false;
    }

    player.corePieces++;

    return true;

}


/* ============================================================
   15. COUNT PLAYER PIECES
   ============================================================ */

function countPieces(
    playerColor,
    status
) {

    const player =
        getPlayer(playerColor);

    if (!player) {
        return 0;
    }

    return player.pieces.filter(
        piece =>
            piece.status === status
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
   16. COUNT PIECES IN CORE
   ============================================================ */

function countCorePieces(
    playerColor
) {

    const player =
        getPlayer(playerColor);

    if (!player) {
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
   17. TURN CONTROL
   ============================================================ */

function advanceTurn() {

    gameState.turnIndex =
        (
            gameState.turnIndex + 1
        )
        %
        PLAYERS.length;

    gameState.currentPlayer =
        PLAYERS[
            gameState.turnIndex
        ];

    /*
     * Reset turn-specific information.
     */

    gameState.hasRolled = false;

    gameState.lastRoll = null;

    gameState.lastCoins = [];

    gameState.initialEntriesThisRoll = 0;

    gameState.selectedPieceId = null;

    gameState.availableMoves = [];

    gameState.splitAvailable = false;

    gameState.splitUsed = false;

    gameState.splitMoves = [];

    return gameState.currentPlayer;

}


/* ============================================================
   18. SET CURRENT PLAYER
   ============================================================ */

function setCurrentPlayer(color) {

    const index =
        PLAYERS.indexOf(color);

    if (index === -1) {
        return false;
    }

    gameState.turnIndex =
        index;

    gameState.currentPlayer =
        color;

    return true;

}


/* ============================================================
   19. SET GAME STARTED
   ============================================================ */

function setGameStarted(value = true) {

    gameState.started =
        Boolean(value);

    return gameState.started;

}


/* ============================================================
   20. PUBLIC API
   ============================================================ */

window.AstaChammaState = Object.freeze({

    PLAYERS,
    PIECE_TYPES,
    PIECE_STATUS,

    CORE_POSITION,
    PIECES_PER_PLAYER,

    getGameState,
    resetGameState,

    getPlayer,
    getPiece,

    activatePiece,
    capturePiece,
    setPiecePosition,

    addCapture,
    markCoreReached,

    countPieces,
    countActivePieces,
    countInactivePieces,
    countNeverActivatedPieces,
    countCorePieces,

    advanceTurn,
    setCurrentPlayer,

    setGameStarted

});
