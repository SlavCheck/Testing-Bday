// game/scenes/index.js
// Порядок сцен – именно тот, в котором они будут последовательно
// подключаться в игре. Добавляйте новые сцены в конец массива.
module.exports = [
    require('./intro'),        // 0
    require('./path'),         // 1
    // require('./cafeteria'), // <– будущие сцены
    // require('./smartRoom'), //   (раскомментируйте/добавьте когда создадите)
    // require('./r2d2'),
    // require('./closedDoor'),
    // require('./serverRoom'),
    // require('./vader'),
    // require('./defense'),
    // require('./finalAttack'),
    // require('./finale')
];
