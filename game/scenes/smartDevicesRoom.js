module.exports = {
    id: "smartDevicesRoom",
    nextSceneId: "adventR2D2",               // «по умолчанию» если ни один вариант не задаёт свой переход
    background: "/assets/backgrounds/smart_devices_room_bckg.png",
    voice: "/assets/sounds/Scene11_smarthome_room.wav",
    text: "Вы заходите в комнату умных устройств. На полках — десятки колонок, лампочек, розеток. Все они мигают разными цветами. Но здесь никого нет. Только устройства и тишина",
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
            text: "🔌 Взять умную розетку",
            points: {
                ownTeam: 10,
                otherTeam: 5
            },
            nextSceneId: "adventR2D2",
            transitionText: "Отлично! Пришло время проверить комнату с умными устройствами!"
        },
    
        {
            id: "joker",
            team: "joker",
            text: "💡 Взять умную лампочку",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            nextSceneId: "adventR2D2",
            transitionText: "Отлично! Пришло время проверить комнату с умными устройствами!"
        },
    
        {
            id: "critic",
            team: "critic",
            text: "🚪 Пойти в серверную",
            points: {
                ownTeam: 10,
                otherTeam: 5
            },
            nextSceneId: "adventR2D2",
            transitionText: "Отлично! Пришло время проверить комнату с умными устройствами!"
        }
    ]
};
