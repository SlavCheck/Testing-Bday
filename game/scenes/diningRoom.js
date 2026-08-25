module.exports = {
    id: "diningRoom",
    nextSceneId: "diningRoom2",               // «по умолчанию» если ни один вариант не задаёт свой переход
    background: "/assets/backgrounds/dining_room_bckg.png",
    character: {
        name: "Чубакка",
        image: "/assets/characters/Chubakka_portr.png"
    },
    voice: "/assets/sounds/Scene9_chubakka_first_scene.wav",
    text: "«Р-р-р-р-р!» (перевод: «Вы пришли! Наконец-то! Я заскучал!») (пауза) «Р-р-р-р!» (перевод: «Хотите кофе? Кофемашина сломана. Она выдаёт только эспрессо, когда просишь капучино») (пауза) Чубакка подмигивает вам и пододвигает ближе две чашки",
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
            text: "Чубакка, почини кофемашину. Это баг в прошивке. Нужно обновить ПО",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            nextSceneId: "diningRoom2",
            transitionText: "ТЕКСТ"
        },
    
        {
            id: "joker",
            team: "joker",
            text: "Чубакка, а ты случайно не брат нашего тимлида? Вы оба всё время ворчите и пьёте кофе!",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            nextSceneId: "diningRoom2",
            transitionText: "Текст2"
        },
    
        {
            id: "critic",
            team: "critic",
            text: "Надеюсь, в твоём кофе нет приправы под названием шерсть Чубакки",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            nextSceneId: "diningRoom2",
            transitionText: "Текст3"
        }
    ]
};
