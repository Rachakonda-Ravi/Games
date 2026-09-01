/* ============================================================
   ASTACHAMMA — GAVVA / COIN ENGINE
   ============================================================

   Five Gavva are thrown for every roll.

   Gavva result:
       0 open  → 8
       1 open  → 1
       2 open  → 2
       3 open  → 3
       4 open  → 4
       5 open  → 8

   Internally:
       0 = closed
       1 = open

   This module ONLY handles:
       - Gavva generation
       - Gavva validation
       - Open-Gavva counting
       - Roll conversion

   It does NOT handle:
       - Knight movement
       - King movement
       - Splitting
       - Combat
       - Turns
       - Victory

   ============================================================ */


/* ============================================================
   1. CONSTANTS
   ============================================================ */

const GAVVA_COUNT = 5;

const GAVVA_CLOSED = 0;
const GAVVA_OPEN = 1;


/*
 * Official AstaChamma mapping supplied for this project.
 *
 * Number of open Gavva → game roll
 */

const ROLL_MAP = Object.freeze({

    0: 8,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 8

});


/* ============================================================
   2. VALIDATE GAVVA RESULT
   ============================================================ */

function isValidGavvaResult(
    gavva
) {

    if (!Array.isArray(gavva)) {
        return false;
    }

    if (
        gavva.length !==
        GAVVA_COUNT
    ) {

        return false;

    }

    return gavva.every(
        value =>
            value === GAVVA_CLOSED ||
            value === GAVVA_OPEN
    );

}


/* ============================================================
   3. COUNT OPEN GAVVA
   ============================================================ */

function countOpenGavva(
    gavva
) {

    if (
        !isValidGavvaResult(
            gavva
        )
    ) {

        return null;

    }

    return gavva.reduce(
        (
            count,
            value
        ) => {

            return count + value;

        },
        0
    );

}


/* ============================================================
   4. CONVERT GAVVA → ROLL
   ============================================================ */

function calculateRoll(
    gavva
) {

    const openCount =
        countOpenGavva(
            gavva
        );


    if (
        openCount === null
    ) {

        return null;

    }


    return ROLL_MAP[
        openCount
    ];

}


/* ============================================================
   5. GENERATE ONE GAVVA
   ============================================================ */

function generateGavva() {

    /*
     * Math.random() < 0.5
     *
     * 0 = closed
     * 1 = open
     */

    return Math.random() < 0.5
        ? GAVVA_OPEN
        : GAVVA_CLOSED;

}


/* ============================================================
   6. THROW FIVE GAVVA
   ============================================================ */

function throwGavva() {

    const gavva = [];

    for (
        let i = 0;
        i < GAVVA_COUNT;
        i++
    ) {

        gavva.push(
            generateGavva()
        );

    }


    const openCount =
        countOpenGavva(
            gavva
        );


    const roll =
        ROLL_MAP[
            openCount
        ];


    return {

        gavva,

        openCount,

        roll

    };

}


/* ============================================================
   7. CREATE A DETERMINISTIC RESULT
   ============================================================

   Useful for:
       - testing
       - debugging
       - UI development
       - automated tests

   Examples:

       createResult([1,1,1,1,1])
           → 8

       createResult([1,1,0,0,0])
           → 2

   ============================================================ */

function createResult(
    gavva
) {

    if (
        !isValidGavvaResult(
            gavva
        )
    ) {

        return null;

    }


    const normalized =
        [...gavva];


    const openCount =
        countOpenGavva(
            normalized
        );


    return {

        gavva:
            normalized,

        openCount,

        roll:
            ROLL_MAP[
                openCount
            ]

    };

}


/* ============================================================
   8. GET POSSIBLE RESULTS
   ============================================================

   There are 2^5 = 32 possible physical Gavva
   combinations, but only 6 open-count outcomes.

   This is useful for UI/help/testing.

   ============================================================ */

function getPossibleResults() {

    return Object.keys(
        ROLL_MAP
    ).map(
        key => {

            const openCount =
                Number(key);

            return {

                openCount,

                roll:
                    ROLL_MAP[
                        openCount
                    ],

                combinations:
                    binomialCoefficient(
                        GAVVA_COUNT,
                        openCount
                    ),

                probability:
                    binomialCoefficient(
                        GAVVA_COUNT,
                        openCount
                    )
                    /
                    Math.pow(
                        2,
                        GAVVA_COUNT
                    )

            };

        }
    );

}


/* ============================================================
   9. BINOMIAL COEFFICIENT
   ============================================================ */

function binomialCoefficient(
    n,
    k
) {

    if (
        !Number.isInteger(n) ||
        !Number.isInteger(k) ||
        k < 0 ||
        k > n
    ) {

        return 0;

    }


    /*
     * C(n,0) = 1
     */

    if (
        k === 0 ||
        k === n
    ) {

        return 1;

    }


    /*
     * Use the smaller side:
     *
     * C(n,k) = C(n,n-k)
     */

    k =
        Math.min(
            k,
            n - k
        );


    let result = 1;


    for (
        let i = 1;
        i <= k;
        i++
    ) {

        result =
            result *
            (n - k + i)
            /
            i;

    }


    return result;

}


/* ============================================================
   10. GET ROLL FROM OPEN COUNT
   ============================================================ */

function getRollFromOpenCount(
    openCount
) {

    if (
        !Number.isInteger(
            openCount
        )
    ) {

        return null;

    }


    if (
        openCount < 0 ||
        openCount > GAVVA_COUNT
    ) {

        return null;

    }


    return ROLL_MAP[
        openCount
    ];

}


/* ============================================================
   11. GET GAVVA DESCRIPTION
   ============================================================ */

function describeResult(
    gavva
) {

    const result =
        createResult(
            gavva
        );


    if (!result) {

        return null;

    }


    let description;


    switch (
        result.openCount
    ) {

        case 0:
            description =
                "No Gavva open — special 8";

            break;

        case 1:
            description =
                "1 Gavva open — roll 1";

            break;

        case 2:
            description =
                "2 Gavva open — roll 2";

            break;

        case 3:
            description =
                "3 Gavva open — roll 3";

            break;

        case 4:
            description =
                "4 Gavva open — roll 4";

            break;

        case 5:
            description =
                "All 5 Gavva open — special 8";

            break;

        default:
            description =
                "Invalid Gavva result";

    }


    return {

        ...result,

        description

    };

}


/* ============================================================
   12. PUBLIC API
   ============================================================ */

window.AstaChammaCoins =
    Object.freeze({

        GAVVA_COUNT,

        GAVVA_CLOSED,
        GAVVA_OPEN,

        ROLL_MAP,

        isValidGavvaResult,

        countOpenGavva,

        calculateRoll,

        generateGavva,

        throwGavva,

        createResult,

        getPossibleResults,

        getRollFromOpenCount,

        describeResult

    });