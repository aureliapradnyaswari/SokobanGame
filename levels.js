const LEVELS = [
  { name: 'First push', map: [
    '#########',
    '#       #',
    '#     . #',
    '#  $    #',
    '#@      #',
    '#########'] },
  { name: 'Two crates', map: [
    '########',
    '#   .  #',
    '# $$@  #',
    '#   .  #',
    '########'] },
  { name: 'Long way round', map: [
    '###########',
    '# $      .#',
    '#@##### # #',
    '# $.    # #',
    '# # ##### #',
    '# $      .#',
    '###########'] },
];
if (typeof module !== 'undefined') module.exports = LEVELS;

// Legend:
// # wall,
//   space floor,
// . goal,
// $ crate,
// @ player,
// * crate on goal,
// + player on goal