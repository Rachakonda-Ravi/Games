/* ============================================================
   ASTACHAMMA — GAMEPLAY / BOARD GEOMETRY
   ============================================================

   RESPONSIBILITIES
   ----------------
   This module is the single source of truth for:

   - Physical board layout
   - Physical cell coordinates
   - Player-specific logical routes
   - Start positions
   - Inner-path entry
   - Position before CORE
   - Converting logical positions to physical cells
   - Finding destinations by movement distance
   - Route distance calculations

   IMPORTANT
   ---------
   Logical positions are NOT changed between players.

   Every player travels exactly:

       24 numbered positions → CORE

   Player routes are rotations of the common outer route,
   followed by that player's inner route.

   State.js stores logical positions.
   Gameplay.js converts those logical positions to the
   appropriate physical board cells.

   ============================================================ */


/* ============================================================
   1. CONSTANTS
   ============================================================ */

const GAMEPLAY_CORE = 25;

const GAMEPLAY_PLAYERS = Object.freeze([
    "red",
    "blue",
    "green",
    "yellow"
]);


/* ============================================================
   2. PHYSICAL BOARD
   ============================================================

   Board:

       ┌────┬────┬────┬────┬────┐
       │15  │16  │ 1  │ 2  │ 3  │
       ├────┼────┼────┼────┼────┤
       │14  │17  │18  │19  │ 4  │
       ├────┼────┼────┼────┼────┤
       │13  │24  │CORE│20  │ 5  │
       ├────┼────┼────┼────┼────┤
       │12  │23  │22  │21  │ 6  │
       ├────┼────┼────┼────┼────┤
       │11  │10  │ 9  │ 8  │ 7  │
       └────┴────┴────┴────┴────┘

   Coordinates are:

       row = 0..4
       col = 0..4

   CORE is represented separately.

   ============================================================ */

const BOARD_COORDINATES = Object.freeze({

    1:  { row: 0, col: 2 },
    2:  { row: 0, col: 3 },
    3:  { row: 0, col: 4 },

    4:  { row: 1, col: 4 },

    5:  { row: 2, col: 4 },
    6:  { row: 3, col: 4 },
    7:  { row: 4, col: 4 },

    8:  { row: 4, col: 3 },
    9:  { row: 4, col: 2 },
    10: { row: 4, col: 1 },
    11: { row: 4, col: 0 },

    12: { row: 3, col: 0 },
    13: { row: 2, col: 0 },
    14: { row: 1, col: 0 },
    15: { row: 0, col: 0 },

    16: { row: 0, col: 1 },

    17: { row: 1, col: 1 },
    18: { row: 1, col: 2 },
    19: { row: 1, col: 3 },

    20: { row: 2, col: 3 },

    21: { row: 3, col: 3 },
    22: { row: 3, col: 2 },
    23: { row: 3, col: 1 },

    24: { row: 2, col: 1 }

});


/* ============================================================
   3. CORE COORDINATE
   ============================================================ */

const CORE_COORDINATE = Object.freeze({
    row: 2,
    col: 2
});


/* ============================================================
   4. COMMON OUTER ROUTE
   ============================================================

   The common physical outer route is:

       1 → 2 → 3 → 4 → 5 → 6 → 7 → 8
       → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16

   This is followed by each player's individual inner route.

   ============================================================ */

const OUTER_ROUTE = Object.freeze([
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16
]);


/* ============================================================
   5. PLAYER ROUTES
   ============================================================

   Every route contains exactly 24 numbered positions.

   RED
   ---
   1 → 2 → ... → 16 → 17 → 18 → 19 → 20 → 21
   → 22 → 23 → 24 → CORE

   BLUE
   ----
   5 → 6 → ... → 16 → 1 → 2 → 3 → 4
   → 19 → 20 → 21 → 22 → 23 → 24 → 17 → 18
   → CORE

   GREEN
   -----
   13 → 14 → 15 → 16 → 1 → 2 → ... → 12
   → 23 → 24 → 17 → 18 → 19 → 20 → 21 → 22
   → CORE

   YELLOW
   ------
   9 → 10 → ... → 16 → 1 → 2 → ... → 8
   → 21 → 22 → 23 → 24 → 17 → 18 → 19 → 20
   → CORE

   Each contains:

       24 numbered positions
       +
       CORE

   ============================================================ */

const PLAYER_ROUTES = Object.freeze({

    red: Object.freeze([
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        20,
        21,
        22,
        23,
        24
    ]),

    blue: Object.freeze([
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        1,
        2,
        3,
        4,
        19,
        20,
        21,
        22,
        23,
        24,
        17,
        18
    ]),

    green: Object.freeze([
        13,
        14,
        15,
        16,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        23,
        24,
        17,
        18,
        19,
        20,
        21,
        22
    ]),

    yellow: Object.freeze([
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        21,
        22,
        23,
        24,
        17,
        18,
        19,
        20
    ])

});


/* ============================================================
   6. ROUTE INFORMATION
   ============================================================ */

const ROUTE_INFO = Object.freeze({

    red: Object.freeze({
        start: 1,
        innerEntry: 17,
        beforeCore: 24
    }),

    blue: Object.freeze({
        start: 5,
        innerEntry: 19,
        beforeCore: 18
    }),

    green: Object.freeze({
        start: 13,
        innerEntry: 23,
        beforeCore: 22
    }),

    yellow: Object.freeze({
        start: 9,
        innerEntry: 21,
        beforeCore: 20
    })

});


/* ============================================================
   7. BASIC VALIDATION
   ============================================================ */

function isValidPlayer(
    playerColor
) {

    return GAMEPLAY_PLAYERS.includes(
        playerColor
    );

}


function isValidLogicalPosition(
    position
) {

    return (
        Number.isInteger(position)
        &&
        (
            position >= 1 &&
            position <= 25
        )
    );

}


function isNumberedPosition(
    position
) {

    return (
        Number.isInteger(position)
        &&
        position >= 1 &&
        position <= 24
    );

}


function isCore(
    position
) {

    return position === GAMEPLAY_CORE;

}


/* ============================================================
   8. GET PLAYER ROUTE
   ============================================================ */

function getPlayerRoute(
    playerColor
) {

    if (
        !isValidPlayer(
            playerColor
        )
    ) {

        return null;

    }


    return PLAYER_ROUTES[
        playerColor
    ];

}


/* ============================================================
   9. GET ROUTE INFORMATION
   ============================================================ */

function getRouteInfo(
    playerColor
) {

    if (
        !isValidPlayer(
            playerColor
        )
    ) {

        return null;

    }


    return ROUTE_INFO[
        playerColor
    ];

}


/* ============================================================
   10. GET START POSITION
   ============================================================ */

function getStartPosition(
    playerColor
) {

    const info =
        getRouteInfo(
            playerColor
        );


    return info
        ? info.start
        : null;

}


/* ============================================================
   11. GET INNER ENTRY
   ============================================================ */

function getInnerEntry(
    playerColor
) {

    const info =
        getRouteInfo(
            playerColor
        );


    return info
        ? info.innerEntry
        : null;

}


/* ============================================================
   12. GET POSITION BEFORE CORE
   ============================================================ */

function getBeforeCorePosition(
    playerColor
) {

    const info =
        getRouteInfo(
            playerColor
        );


    return info
        ? info.beforeCore
        : null;

}


/* ============================================================
   13. GET ROUTE INDEX
   ============================================================

   The first numbered position for a player is index 0.

   Example:

       Red:
           logical 1 → index 0
           logical 2 → index 1

       Blue:
           logical 5 → index 0
           logical 6 → index 1

   ============================================================ */

function getRouteIndex(
    playerColor,
    logicalPosition
) {

    const route =
        getPlayerRoute(
            playerColor
        );


    if (!route) {
        return -1;
    }


    return route.indexOf(
        logicalPosition
    );

}


/* ============================================================
   14. GET LOGICAL POSITION FROM ROUTE INDEX
   ============================================================ */

function getPositionAtIndex(
    playerColor,
    routeIndex
) {

    const route =
        getPlayerRoute(
            playerColor
        );


    if (!route) {
        return null;
    }


    if (
        !Number.isInteger(
            routeIndex
        )
    ) {

        return null;

    }


    /*
     * Index 0..23 = numbered route.
     *
     * Index 24 = CORE.
     */

    if (
        routeIndex >= 0 &&
        routeIndex < route.length
    ) {

        return route[
            routeIndex
        ];

    }


    if (
        routeIndex === route.length
    ) {

        return GAMEPLAY_CORE;

    }


    return null;

}


/* ============================================================
   15. GET PHYSICAL COORDINATE
   ============================================================ */

function getPhysicalCoordinate(
    logicalPosition
) {

    if (
        isCore(
            logicalPosition
        )
    ) {

        return {
            ...CORE_COORDINATE
        };

    }


    if (
        !isNumberedPosition(
            logicalPosition
        )
    ) {

        return null;

    }


    const coordinate =
        BOARD_COORDINATES[
            logicalPosition
        ];


    if (!coordinate) {
        return null;
    }


    return {
        ...coordinate
    };

}


/* ============================================================
   16. GET PHYSICAL CELL KEY
   ============================================================

   Returns a convenient key for DOM/UI use.

   Example:

       "2-3"

   means:

       row 2
       column 3

   ============================================================ */

function getPhysicalCellKey(
    logicalPosition
) {

    const coordinate =
        getPhysicalCoordinate(
            logicalPosition
        );


    if (!coordinate) {
        return null;
    }


    return `${coordinate.row}-${coordinate.col}`;

}


/* ============================================================
   17. GET LOGICAL POSITION FROM PHYSICAL CELL
   ============================================================ */

function getLogicalPositionFromCell(
    row,
    col
) {

    if (
        row === CORE_COORDINATE.row &&
        col === CORE_COORDINATE.col
    ) {

        return GAMEPLAY_CORE;

    }


    for (
        const position of Object.keys(
            BOARD_COORDINATES
        )
    ) {

        const coordinate =
            BOARD_COORDINATES[
                position
            ];


        if (
            coordinate.row === row &&
            coordinate.col === col
        ) {

            return Number(
                position
            );

        }

    }


    return null;

}


/* ============================================================
   18. GET NEXT POSITION
   ============================================================

   Moves one logical block forward along the player's route.

   Example:

       Red:
           16 → 17

       Blue:
           4 → 19

       Green:
           12 → 23

       Yellow:
           8 → 21

   ============================================================ */

function getNextPosition(
    playerColor,
    currentPosition
) {

    const route =
        getPlayerRoute(
            playerColor
        );


    if (!route) {
        return null;
    }


    if (
        currentPosition ===
        GAMEPLAY_CORE
    ) {

        return GAMEPLAY_CORE;

    }


    const index =
        route.indexOf(
            currentPosition
        );


    if (
        index === -1
    ) {

        return null;

    }


    if (
        index + 1 >=
        route.length
    ) {

        return GAMEPLAY_CORE;

    }


    return route[
        index + 1
    ];

}


/* ============================================================
   19. GET DESTINATION
   ============================================================

   Move a piece by a specified number of logical blocks.

   CORE is considered the position immediately after the
   player's final numbered position.

   Example:

       Red:
           current 16, distance 1
           → 17

       Blue:
           current 4, distance 1
           → 19

       Green:
           current 12, distance 1
           → 23

       Yellow:
           current 8, distance 1
           → 21

   ============================================================ */

function getDestination(
    playerColor,
    currentPosition,
    distance
) {

    const route =
        getPlayerRoute(
            playerColor
        );


    if (!route) {
        return null;
    }


    if (
        !Number.isInteger(
            distance
        ) ||
        distance < 0
    ) {

        return null;

    }


    if (
        currentPosition ===
        GAMEPLAY_CORE
    ) {

        return GAMEPLAY_CORE;

    }


    const currentIndex =
        route.indexOf(
            currentPosition
        );


    if (
        currentIndex === -1
    ) {

        return null;

    }


    const destinationIndex =
        currentIndex +
        distance;


    /*
     * Beyond Core is not allowed.
     */

    if (
        destinationIndex >
        route.length
    ) {

        return null;

    }


    /*
     * Exactly one position beyond the final numbered
     * position means CORE.
     */

    if (
        destinationIndex ===
        route.length
    ) {

        return GAMEPLAY_CORE;

    }


    return route[
        destinationIndex
    ];

}


/* ============================================================
   20. CALCULATE ROUTE DISTANCE
   ============================================================

   Returns the number of blocks between two logical positions
   on one player's route.

   ============================================================ */

function getRouteDistance(
    playerColor,
    fromPosition,
    toPosition
) {

    const route =
        getPlayerRoute(
            playerColor
        );


    if (!route) {
        return null;
    }


    const fromIndex =
        fromPosition ===
            GAMEPLAY_CORE
            ? route.length
            : route.indexOf(
                fromPosition
            );


    const toIndex =
        toPosition ===
            GAMEPLAY_CORE
            ? route.length
            : route.indexOf(
                toPosition
            );


    if (
        fromIndex === -1 ||
        toIndex === -1
    ) {

        return null;

    }


    if (
        toIndex < fromIndex
    ) {

        return null;

    }


    return (
        toIndex -
        fromIndex
    );

}


/* ============================================================
   21. CAN REACH DESTINATION
   ============================================================ */

function canReachDestination(
    playerColor,
    currentPosition,
    distance
) {

    return (
        getDestination(
            playerColor,
            currentPosition,
            distance
        ) !== null
    );

}


/* ============================================================
   22. IS INNER PATH POSITION
   ============================================================

   The inner path begins at each player's designated
   inner-entry position.

   ============================================================ */

function isInnerPathPosition(
    playerColor,
    logicalPosition
) {

    const route =
        getPlayerRoute(
            playerColor
        );


    if (!route) {
        return false;
    }


    const entry =
        getInnerEntry(
            playerColor
        );


    const entryIndex =
        route.indexOf(
            entry
        );


    const positionIndex =
        route.indexOf(
            logicalPosition
        );


    if (
        entryIndex === -1 ||
        positionIndex === -1
    ) {

        return false;

    }


    return (
        positionIndex >=
        entryIndex
    );

}


/* ============================================================
   23. IS BEFORE CORE
   ============================================================ */

function isBeforeCore(
    playerColor,
    logicalPosition
) {

    return (
        logicalPosition ===
        getBeforeCorePosition(
            playerColor
        )
    );

}


/* ============================================================
   24. GET ROUTE LENGTH
   ============================================================ */

function getRouteLength(
    playerColor
) {

    const route =
        getPlayerRoute(
            playerColor
        );


    if (!route) {
        return 0;
    }


    /*
     * Numbered positions only.
     */

    return route.length;

}


/* ============================================================
   25. GET TOTAL DISTANCE TO CORE
   ============================================================

   Every player must travel exactly 24 blocks from their
   starting logical position to CORE.

   ============================================================ */

function getDistanceToCore(
    playerColor,
    currentPosition
) {

    return getRouteDistance(
        playerColor,
        currentPosition,
        GAMEPLAY_CORE
    );

}


/* ============================================================
   26. VERIFY EQUAL ROUTES
   ============================================================

   Internal consistency check.

   Every player must have:

       24 numbered positions
       unique positions
       same total route length
       CORE immediately after final route position

   ============================================================ */

function validatePlayerRoutes() {

    for (
        const player of
        GAMEPLAY_PLAYERS
    ) {

        const route =
            PLAYER_ROUTES[
                player
            ];


        if (
            !Array.isArray(
                route
            )
        ) {

            return false;

        }


        if (
            route.length !== 24
        ) {

            return false;

        }


        /*
         * Every numbered position must occur exactly once.
         */

        const unique =
            new Set(
                route
            );


        if (
            unique.size !== 24
        ) {

            return false;

        }


        for (
            let position = 1;
            position <= 24;
            position++
        ) {

            if (
                !unique.has(
                    position
                )
            ) {

                return false;

            }

        }


        const info =
            ROUTE_INFO[
                player
            ];


        if (
            route[0] !==
            info.start
        ) {

            return false;

        }


        if (
            route[
                route.length - 1
            ] !==
            info.beforeCore
        ) {

            return false;

        }


        const innerIndex =
            route.indexOf(
                info.innerEntry
            );


        if (
            innerIndex === -1
        ) {

            return false;

        }

    }


    return true;

}


/* ============================================================
   27. GET COMPLETE PLAYER ROUTE
   ============================================================

   Useful for UI/debugging.

   Returns:

       numbered route + CORE

   ============================================================ */

function getCompleteRoute(
    playerColor
) {

    const route =
        getPlayerRoute(
            playerColor
        );


    if (!route) {
        return null;
    }


    return [
        ...route,
        GAMEPLAY_CORE
    ];

}


/* ============================================================
   28. GET ALL BOARD COORDINATES
   ============================================================ */

function getBoardCoordinates() {

    return {
        ...BOARD_COORDINATES,
        [GAMEPLAY_CORE]:
            {
                ...CORE_COORDINATE
            }
    };

}


/* ============================================================
   29. PUBLIC API
   ============================================================ */

window.AstaChammaGameplay =
    Object.freeze({

        CORE_POSITION:
            GAMEPLAY_CORE,

        PLAYERS:
            GAMEPLAY_PLAYERS,

        BOARD_COORDINATES,

        CORE_COORDINATE,

        OUTER_ROUTE,

        PLAYER_ROUTES,

        ROUTE_INFO,


        isValidPlayer,

        isValidLogicalPosition,

        isNumberedPosition,

        isCore,


        getPlayerRoute,

        getCompleteRoute,

        getRouteInfo,

        getStartPosition,

        getInnerEntry,

        getBeforeCorePosition,


        getRouteIndex,

        getPositionAtIndex,


        getPhysicalCoordinate,

        getPhysicalCellKey,

        getLogicalPositionFromCell,


        getNextPosition,

        getDestination,

        getRouteDistance,

        getDistanceToCore,

        canReachDestination,


        isInnerPathPosition,

        isBeforeCore,


        getRouteLength,

        getBoardCoordinates,


        validatePlayerRoutes

    });