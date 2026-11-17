"use strict";
module.exports = {
 id: "potion-recipe", type: "potion_recipe", title: "Собери зелье по рецепту!",
 duration: 80, memorizeSeconds: 20, points: 30,
 recipeText: "Для приготовления зелья удачи возьмите корень мандрагоры и измельчите его. Добавьте шкуру бумсланга и тщательно перемешайте. Влейте слезу феникса и доведите до кипения. В конце добавьте порошок бирюзы и щепотку волос единорога. Варите 5 минут, помешивая палочкой из остролиста.",
 ingredients: [
  {id:"boomslang",label:"Шкура бумсланга"},
  {id:"turquoise",label:"Порошок бирюзы"},
  {id:"unicorn_hair",label:"Волос единорога"},
  {id:"holly_wand",label:"Палочка из остролиста"},
  {id:"phoenix_tear",label:"Слеза феникса"},
  {id:"mandrake",label:"Корень мандрагоры"},
  {id:"dragon_eye",label:"Глаз дракона"},
  {id:"unicorn_blood",label:"Кровь единорога"},
  {id:"dragon_scale",label:"Чешуя дракона"}
 ],
 correctIds:["boomslang","turquoise","unicorn_hair","holly_wand","phoenix_tear","mandrake"]
};