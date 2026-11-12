"use strict";
const HOUSES = Object.freeze([
    { id: "gryffindor", name: "Гриффиндор" },
    { id: "slytherin", name: "Слизерин" },
    { id: "ravenclaw", name: "Когтевран" },
    { id: "hufflepuff", name: "Пуффендуй" }
]);
function assignNextHouse(game) {
    if (!Number.isSafeInteger(game.nextHouseIndex) || game.nextHouseIndex < 0) {
        game.nextHouseIndex = 0;
    }
    const house = HOUSES[game.nextHouseIndex % HOUSES.length].id;
    game.nextHouseIndex++;
    return house;
}
module.exports = { HOUSES, assignNextHouse };
