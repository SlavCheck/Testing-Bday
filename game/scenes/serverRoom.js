module.exports = {
    id: "serverRoom",
    nextSceneId: "serverRoomDart1",               // «по умолчанию» если ни один вариант не задаёт свой переход
    background: "/assets/backgrounds/serverRoom.png",
    voice: "/assets/sounds/Scene16_enter_to_the_server_room.wav",
    text: "Вы входите в серверную. Темно. Очень темно. Ни одного источника света. Только гул серверов и красные огоньки на стойках. Вы стоите на пороге и не знаете, куда идти",
    voting: {
        enabled: true,
        duration: 35,
        tieBreak: "revote",
        revoteDuration: 15
    },
    transition: {
        title: "Заголовок",
        text: "Текст"
    },
    choices: [
        {
            id: "strategist",
            team: "strategist",
            text: "🧠 Идти на ощупь — Без страха! Мы — тестировщики. Мы привыкли работать с тёмными коробками",
            points: {
                ownTeam: 15,
                otherTeam: 15
            },
            nextSceneId: "serverRoomDart1",
            transitionText: "ТЕКСТ"
        },
    
        {
            id: "joker",
            team: "joker",
            text: "💡 Осветить лампочкой — «У нас есть умная лампочка! Она осветит нам путь!»",
            points: {
                ownTeam: 50,
                otherTeam: 50
            },
            nextSceneId: "serverRoomDart1",
            transitionText: "Текст2"
        },
    
        {
            id: "critic",
            team: "critic",
            text: "🚪 Развернуться и уйти — «Нет, это слишком опасно. Мы не готовы»",
            points: {
                ownTeam: 15,
                otherTeam: 15
            },
            nextSceneId: "serverRoomDart1",
            transitionText: "Текст3"
        }
    ]
};
