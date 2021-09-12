import { Word } from 'languages';

export const characterDictionary: Word[] = [
  { source: 'decade', target: '十周年' },

  { source: 'lijue', target: '李傕' },
  { source: 'langxi', target: '狼袭' },
  { source: 'yisuan', target: '亦算' },

  { source: 'guosi', target: '郭汜' },
  { source: 'tanbei', target: '贪狈' },
  { source: 'sidao', target: '伺盗' },

  { source: 'fanchou', target: '樊稠' },
  { source: 'xingluan', target: '兴乱' },

  { source: 'zhangji', target: '张济' },
  { source: 'lveming', target: '掠命' },
  { source: 'lveming times: {0}', target: '掠命[{0}]' },
  { source: 'tunjun', target: '屯军' },

  { source: 'liangxing', target: '梁兴' },
  { source: 'lulve', target: '掳掠' },
  { source: 'zhuixi', target: '追袭' },

  { source: 'panfeng', target: '潘凤' },
  { source: 'kuangfu', target: '狂斧' },

  { source: 'xingdaorong', target: '邢道荣' },
  { source: 'xuhe', target: '虚猲' },
];

export const skillDescriptions: Word[] = [
  {
    source: 'langxi_description',
    target:
      '准备阶段开始时，你可以选择一名体力值不大于你的其他角色，你对其造成0~2点随机伤害。',
  },
  {
    source: 'yisuan_description',
    target:
      '每阶段限一次，当你于出牌阶段内使用普通锦囊牌结算结束后，你可以减1点体力上限，获得之。',
  },

  {
    source: 'tanbei_description',
    target:
      '出牌阶段限一次，你可以令一名其他角色选择一项：1.令你随机获得其区域内的一张牌，然后你此阶段内不能对其使用牌；2.令你此阶段内对其使用牌无距离和次数限制。',
  },
  {
    source: 'sidao_description',
    target:
      '每阶段限一次，当你于出牌阶段内使用牌结算结束后，若此牌有包含在你于此阶段内使用过的上一张牌的目标中的目标角色，你可以将一张手牌当【顺手牵羊】对其中一名角色使用（目标须合法）。',
  },

  {
    source: 'xingluan_description',
    target:
      '每阶段限一次，当你于出牌阶段内使用牌结算结束后，你可以从牌堆随机获得点数为6的一张牌。',
  },

  {
    source: 'lveming_description',
    target:
      '出牌阶段限一次，你可以令装备区里牌数小于你的一名角色选择一个点数，然后你判定，若结果点数与其所选点数：相等，你对其造成2点伤害；不等，你随机获得其区域里的一张牌。',
  },
  {
    source: 'tunjun_description',
    target:
      '<b>限定技</b>，出牌阶段，你可以令有空装备栏的一名角色依次从牌堆随机使用X张其装备区内没有的副类别的装备牌（X为你本局游戏发动过“掠命”的次数）。',
  },

  {
    source: 'lulve_description',
    target:
      '出牌阶段开始时，你可以令有手牌且手牌数小于你的一名角色选择一项：1.将所有手牌交给你，然后你翻面；2.翻面，然后视为对你使用一张【杀】。',
  },
  {
    source: 'zhuixi_description',
    target:
      '<b>锁定技</b>，当你对一名角色造成伤害时，或一名角色对你造成伤害时，若其武将牌正面朝向与你不同，此伤害+1。',
  },

  {
    source: 'kuangfu_description',
    target:
      '出牌阶段限一次，你可以弃置一名角色装备区里的一张牌，然后视为使用一张无距离限制的【杀】（不计入次数限制）。若你以此法弃置的牌为：你的牌，且此【杀】造成过伤害，你摸两张牌；其他角色的牌，且此【杀】未造成过伤害，你弃置两张手牌。',
  },

  {
    source: 'xuhe_description',
    target:
      '出牌阶段开始时，你可以弃置距离1以内的所有角色各一张牌或令这些角色各摸一张牌；出牌阶段结束时，若你的体力上限为全场最少，你加1点体力上限。',
  },
];

export const skillAudios: Word[] = [
  {
    source: '$langxi:1',
    target: '袭夺之势，如狼噬骨！',
  },
  {
    source: '$langxi:2',
    target: '引吾至此，怎能不袭掠之？',
  },
  {
    source: '$yisuan:1',
    target: '吾亦能善算谋划！',
  },
  {
    source: '$yisuan:2',
    target: '算计人心，我也可略施一二。',
  },

  {
    source: '$tanbei:1',
    target: '此机，我怎么会错失？',
  },
  {
    source: '$tanbei:2',
    target: '你的东西，现在是我的了！',
  }, 
  {
    source: '$sidao:1',
    target: '连发伺动，顺手可得。',
  },
  {
    source: '$sidao:2',
    target: '伺机而动，此地可窃。',
  },

  {
    source: '$xingluan:1',
    target: '大兴兵争，长安当乱！',
  },
  {
    source: '$xingluan:2',
    target: '勇猛兴军，乱世当立！',
  },

  {
    source: '$lveming:1',
    target: '劫命掠财，毫不费力。',
  },
  {
    source: '$lveming:2',
    target: '人财，皆掠之。嘿嘿！',
  }, 
  {
    source: '$tunjun:1',
    target: '得封侯爵，屯军弘农。',
  },
  {
    source: '$tunjun:2',
    target: '屯军弘农，养精蓄锐。',
  },

  {
    source: '$lulve:1',
    target: '趁火打劫，乘威掳掠。',
  },
  {
    source: '$lulve:2',
    target: '天下大乱，掳掠以自保。',
  },
  {
    source: '$zhuixi:1',
    target: '得势追袭，胜望在握！',
  },
  {
    source: '$zhuixi:2',
    target: '诸将得令，追而袭之！',
  },

  {
    source: '$kuangfu:1',
    target: '大斧到处，片甲不留！',
  },
  {
    source: '$kuangfu:2',
    target: '你可接得住我一斧？',
  },

  {
    source: '$xuhe:1',
    target: '说出吾名，吓汝一跳！',
  },
  {
    source: '$xuhe:2',
    target: '我乃是零陵上将军！',
  },
];


export const promptDescriptions: Word[] = [
  {
    source: '{0}: do you want to choose a target with hp less than your hp to deal 0-2 damage to him randomly?',
    target:
      '{0}；你可以对体力值不大于你的一名其他角色造成0~2点随机伤害',
  },

  {
    source: '{0}: do you want to lose a max hp to gain {1}?',
    target:
      '{0}；你可以减1点体力上限以获得 {1}',
  },

  {
    source: '{0}: do you want to gain a card with card number 6 from draw stack?',
    target:
      '{0}；你可以从牌堆随机获得点数为6的一张牌',
  },

  {
    source: '{0}: please choose lveming options',
    target:
      '{0}；请选择一个点数',
  },

  {
    source: '{0}: please choose tanbei options: {1}',
    target:
      '{0}；请选择一项：1.令 {1} 随机获得你区域内的一张牌，然后其本回合不能对你使用牌；2.令 {1} 本回合对你用牌无限制',
  },
  { source: 'tanbei:prey', target: '令其获得牌' },
  { source: 'tanbei:unlimited', target: '令其对你用牌无限制' },

  {
    source: '{0}: do you want to use a card as ShunShouQianYang to one of them?',
    target:
      '{0}；你可以将一张手牌当【顺手牵羊】对其中一名角色使用（目标须合法）',
  },

  {
    source: '{0}: do you want to choose a lulve target to use this skill?',
    target:
      '{0}；你可以选择手牌数少于你的一名角色，对其发动“掳掠”',
  },
  {
    source: '{0}: please choose lulve options: {1}',
    target:
      '{0}；请选择一项：1.交给 {1} 所有手牌，其翻面；2.你翻面，视为对 {1} 使用一张【杀】',
  },
  { source: 'lulve:prey', target: '交给其手牌' },
  { source: 'lulve:turnOver', target: '你翻面' },

  {
    source: '{0}: please choose a target to use a virtual slash to him',
    target:
      '{0}；请为此【杀】选择目标',
  },

  {
    source: '{0}: please choose xuhe options: {1}',
    target:
      '{0}；你可以弃置 {1} 各一张牌，或令这些角色各摸一张牌',
  },
  { source: 'xuhe:draw', target: '摸牌' },
  { source: 'xuhe:discard', target: '弃置牌' },
];
