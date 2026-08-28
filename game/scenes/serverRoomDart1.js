module.exports = {
    id: "serverRoomDart1",
    nextSceneId: "serverRoomDart2",               // «по умолчанию» если ни один вариант не задаёт свой переход
    background: "/assets/backgrounds/serverRoomLight.png",
    voice: "/assets/sounds/Scene17_D_Vader_advent.wav",
    text: "Я чувствую ваше присутствие. Вы пришли за мной. Но знайте: я — не просто баг. Я — критический баг. Я — тот, кто уничтожает релизы. Я — ваш страх. Вы не можете меня удалить. Я — часть системы. Я — часть вас",
    character: {
        name: "Дарт Вейдер",
        image: "/assets/characters/DV_portr.png"
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
            text: "Мы — команда. Мы вместе. Мы не боимся тебя",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            nextSceneId: "serverRoomDart2",
            transitionText: "ТЕКСТ"
        },
    
        {
            id: "joker",
            team: "joker",
            text: "Ты — не баг. Ты — легаси. Тебя давно пора прогнать",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            nextSceneId: "serverRoomDart2",
            transitionText: "Текст2"
        },
    
        {
            id: "critic",
            team: "critic",
            text: "За галактику! За релиз! Вперёд!",
            points: {
                ownTeam: 30,
                otherTeam: 10
            },
            nextSceneId: "serverRoomDart2",
            transitionText: "Текст3"
        }
    ]
};
