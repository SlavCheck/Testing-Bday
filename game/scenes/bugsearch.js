module.exports = {

    id: "bugsearch",
    type: "bug_search",
    background: "/assets/backgrounds/Space_station_control_panel_bckg.png",
    character: {
        name: "Алиса",
        image:
            "/assets/characters/alice_portr.png"
    },
    voice:
        "/assets/sounds/Scene5_Alice_search_bugs.wav",

    duration: 60,

    cards: [
        {
            id: "card1",
            image: "/assets/items/img_for_test/light_bulb_bug.png"
        },
        {
            id: "card2",
            image: "/assets/items/img_for_test/Smart_thermostat_no_bug.png"
        },
        {
            id: "card3",
            image: "/assets/items/img_for_test/robot_vacuum_cleaner_bug.png"
        },
        {
            id: "card4",
            image: "/assets/items/img_for_test/Smart_curtains_no_bug.png"
        },
        {
            id: "card5",
            image: "/assets/items/img_for_test/smart_camera_no_bug.png"
        },
        {
            id: "card6",
            image: "/assets/items/img_for_test/power_socket_bug.png"
        }
    ],

    bugs: [
        "card1",
        "card3",
        "card6"
    ],

    points: 100,

    nextSceneId: "officerMeet"
};