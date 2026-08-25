module.exports = {
    id: "diningRoom2",
    nextSceneId: "smartDevicesRoom",               // «по умолчанию» если ни один вариант не задаёт свой переход
    background: "/assets/backgrounds/dining_room_bckg.png",
    voice: "/assets/sounds/Scene10_chubakka_second_scene.wav",
    text: "Р-р-р-р!» (перевод: «Я пытался! Но каждый раз, когда я чиню её, она снова ломается. Это баг в прошивке. Я уже завёл три баг-репорта, но их закрыли с комментарием *не воспроизводится*» Чубакка пожимает плечами и пододвигает вам чашки",
    character: {
        name: "Чубакка",
        image: "/assets/characters/Chubakka_portr.png"
    },
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
            text: "☕ Взять эспрессо — «Спасибо, Чубакка! Беру эспрессо»",
            points: {
                ownTeam: 30,
                otherTeam: 30
            },
            nextSceneId: "smartDevicesRoom",
            transitionText: "Отлично! Пришло время проверить комнату с умными устройствами!"
        },
    
        {
            id: "joker",
            team: "joker",
            text: "🍵 Взять чай — «Нет, спасибо. Я предпочитаю чай»",
            points: {
                ownTeam: 10,
                otherTeam: 10
            },
            nextSceneId: "smartDevicesRoom",
            transitionText: "Отлично! Пришло время проверить комнату с умными устройствами!"
        },
    
        {
            id: "critic",
            team: "critic",
            text: "В комнату умных устройств. Нужно проверить всё до того, как встретимся с Вейдером",
            points: {
                ownTeam: 20,
                otherTeam: 20
            },
            nextSceneId: "smartDevicesRoom",
            transitionText: "Отлично! Пришло время проверить комнату с умными устройствами!"
        }
    ]
};
