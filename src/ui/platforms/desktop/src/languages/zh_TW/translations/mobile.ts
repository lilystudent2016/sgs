import { Word } from 'languages';

export const characterDictionary: Word[] = [
  { source: 'mobile', target: '手殺專屬' },

  { source: 'simazhao', target: '司馬昭' },
  { source: 'daigong', target: '怠攻' },
  { source: 'zhaoxin', target: '昭心' },

  { source: 'jiakui', target: '賈逵' },
  { source: 'zhongzuo', target: '忠佐' },
  { source: 'wanlan', target: '挽瀾' },
  { source: '#wanlan', target: '挽瀾' },

  { source: 'simashi', target: '司馬師' },
  { source: 'baiyi', target: '敗移' },
  { source: 'jinglve', target: '景略' },
  { source: 'sishi: {0} {1}', target: '死士[{0}{1}]' },
  { source: 'shanli', target: '擅立' },

  { source: 'lifeng', target: '李豐' },
  { source: 'tunchu', target: '屯儲' },
  { source: 'shuliang', target: '輸糧' },

  { source: 'dengzhi', target: '鄧芝' },
  { source: 'jimeng', target: '急盟' },
  { source: 'shuaiyan', target: '率言' },

  { source: 'mobile_furong', target: '傅肜' },
  { source: 'xuewei', target: '血衛' },
  { source: 'liechi', target: '烈斥' },

  { source: 'lingcao', target: '凌操' },
  { source: 'dujin', target: '獨進' },

  { source: 'sunru', target: '孫茹' },
  { source: 'yingjian', target: '影箭' },
  { source: 'shixin', target: '釋釁' },

  { source: 'yangbiao', target: '楊彪' },
  { source: 'zhaohan', target: '昭漢' },
  { source: 'rangjie', target: '讓節' },
  { source: 'mobile_yizheng', target: '義爭' },

  { source: 'xing_ganning', target: '星甘寧' },
  { source: 'jinfan', target: '錦帆' },
  { source: 'sheque', target: '射卻' },

  { source: 'gongsunkang', target: '公孫康' },
  { source: 'juliao', target: '據遼' },
  { source: 'taomie', target: '討滅' },
];

export const skillDescriptions: Word[] = [
  {
    source: 'daigong_description',
    target:
      '每回合限一次，當你受到傷害時，你可以展示所有手牌並令傷害來源選擇一項：1.交給你一張與你展示的所有牌花色均不同的牌；2.防止此傷害。',
  },
  {
    source: 'zhaoxin_description',
    target:
      '出牌階段限一次，若X大於0，你可以將一至X張牌置於你的武將牌上，稱爲“望”，然後摸等量的牌（X爲3減去你的“望”數之差）；你或在你攻擊範圍內的角色的摸牌階段結束時，其可以獲得你的一張“望”，然後你可以對其造成1點傷害。',
  },

  {
    source: 'zhongzuo_description',
    target:
      '一名角色的結束階段開始時，若你於此回合內造成或受到過傷害，你可以令一名角色摸兩張牌，然後若其已受傷，你摸一張牌。',
  },
  {
    source: 'wanlan_description',
    target:
      '<b>限定技</b>，當一名角色進入瀕死狀態時，若其體力不大於0，你可以發動此技能，棄置所有手牌，並令其將體力回覆至1點，然後你於此瀕死結算結束後對當前回合角色造成1點傷害。',
  },

  {
    source: 'baiyi_description',
    target: '<b>限定技</b>，出牌階段，若你已受傷，你可以令兩名其他角色交換座次。',
  },
  {
    source: 'jinglve_description',
    target:
      '出牌階段限一次，若場上沒有“死士”牌，你可以觀看一名其他角色的手牌，並選擇其中一張標記爲“死士”牌。若如此做，當其使用“死士”牌時，你取消此牌的所有目標；當“死士”牌不因使用而進入棄牌堆後，或其回合結束時“死士”牌仍在其區域內，你獲得之。',
  },
  {
    source: 'shanli_description',
    target:
      '<b>覺醒技</b>，準備階段開始時，若你已發動過“敗移”，且對至少兩名角色發動過“景略”，你減1點體力上限，令一名角色獲得由你選擇的一項主公技（三選一）。',
  },

  {
    source: 'tunchu_description',
    target:
      '摸牌階段，若你沒有“糧”，你可以多摸兩張牌，然後你可以將至少一張手牌置於你的武將牌上，稱爲“糧”；若你有“糧”，你不能使用【殺】。',
  },
  {
    source: 'shuliang_description',
    target: '一名角色的結束階段開始時，你可以移去一張“糧”，令其摸兩張牌。',
  },

  {
    source: 'xuewei_description',
    target:
      '準備階段開始時，你可以選擇一名其他角色（僅對你可見）。當該角色於此時至你的下個回合開始期間受到第一次傷害時，你防止此傷害，受到同傷害來源的等量傷害（傷害來源死亡則改爲無傷害來源），然後你對傷害來源造成等量的同屬性傷害。',
  },
  {
    source: 'liechi_description',
    target: '<b>鎖定技</b>，當你進入瀕死狀態時，若有令你進入瀕死狀態的角色，其棄置一張手牌。',
  },

  {
    source: 'jimeng_description',
    target: '出牌階段開始時，你可以獲得一名其他角色的一張牌，然後交給其X張牌（X爲你的體力值）。',
  },
  {
    source: 'shuaiyan_description',
    target: '棄牌階段開始時，若你的手牌數大於1，你可以展示所有手牌，令一名其他角色交給你一張牌。',
  },

  {
    source: 'dujin_description',
    target: '摸牌階段，你可以多摸X+1張牌（X爲你裝備區裏牌數的一半，向下取整）。',
  },

  {
    source: 'yingjian_description',
    target: '準備階段開始時，你可以視爲使用一張無距離限制的【殺】。',
  },
  {
    source: 'shixin_description',
    target: '<b>鎖定技</b>，當你受到火焰傷害時，防止之。',
  },

  {
    source: 'zhaohan_description',
    target:
      '<b>鎖定技</b>，準備階段開始時，若你本局遊戲內發動過本技能的次數：不大於3，你加1點體力上限並回復1點體力；大於3且小於7，你減1點體力上限。',
  },
  {
    source: 'rangjie_description',
    target:
      '當你受到1點傷害後，你可以選擇一項：1.移動場上一張牌；2.隨機獲得牌堆裏一張你指定類別的牌。選擇完成後，你摸一張牌。',
  },
  {
    source: 'mobile_yizheng_description',
    target:
      '出牌階段限一次，你可以與體力值不大於你的一名角色拼點。若你：贏，其跳過其下個摸牌階段；沒贏，你減1點體力上限。',
  },

  {
    source: 'jinfan_description',
    target:
      '棄牌階段開始時，你可以將至少一張花色各不相同，且與你的所有“鈴”花色均不相同的手牌置於你的武將牌上，稱爲“鈴”；你的“鈴”可以如手牌般使用或打出；當你的一張“鈴”移至其他區域後，你隨機獲得牌堆裏一張花色相同的牌。',
  },
  {
    source: 'sheque_description',
    target: '其他角色的準備階段開始時，若其裝備區裏有牌，你可以對其使用一張無視防具的【殺】。',
  },

  {
    source: 'juliao_description',
    target: '<b>鎖定技</b>，其他角色計算與你的距離+X（X爲存活勢力數-1）。',
  },
  {
    source: 'taomie_description',
    target:
      '當你對其他角色造成傷害後，或其他角色對你造成傷害後，若其沒有“討滅”標記，你可以發動本技能，移去場上所有“討滅”標記，令其獲得一枚“討滅”標記；你視爲在有“討滅”標記的其他角色的攻擊範圍內；當你對有“討滅”標記的角色造成傷害時，你選擇一項：1.令此傷害+1；2.獲得其區域內的一張牌；3.依次執行前兩項，然後於此傷害流程結算結束後移去其“討滅”標記。',
  },
];

export const skillAudios: Word[] = [
  {
    source: '$daigong:1',
    target: '不急，只等敵軍士氣漸怠。',
  },
  {
    source: '$daigong:2',
    target: '敵謀吾已盡料，可以長策縻之。',
  },
  {
    source: '$zhaoxin:1',
    target: '吾心昭昭，何懼天下之口？',
  },
  {
    source: '$zhaoxin:2',
    target: '公此行欲何爲，吾自有量度。',
  },

  {
    source: '$zhongzuo:1',
    target: '歷經磨難，不改祖國之志！',
  },
  {
    source: '$zhongzuo:2',
    target: '建立功業，惟願天下早定。',
  },
  {
    source: '$wanlan:1',
    target: '挽狂瀾於既倒，扶大廈於將傾！',
  },
  {
    source: '$wanlan:2',
    target: '深受國恩，今日便是報償之時！',
  },

  {
    source: '$baiyi:1',
    target: '吾不聽公休之言，以致需行此策。',
  },
  {
    source: '$baiyi:2',
    target: '諸將無過，且按吾之略再圖破敵。',
  },
  {
    source: '$jinglve:1',
    target: '安待良機，自有捨生報吾之時。',
  },
  {
    source: '$jinglve:2',
    target: '察局備健，以保諸事不虞。',
  },
  {
    source: '$shanli:1',
    target: '蕩塵滌污，重整河山，便在今日！',
  },
  {
    source: '$shanli:2',
    target: '效伊尹霍光，以反天下清明！',
  },

  {
    source: '$tunchu:1',
    target: '屯糧事大，暫不與爾等計較。',
  },
  {
    source: '$tunchu:2',
    target: '屯糧待戰，莫動刀槍。',
  },
  {
    source: '$shuliang:1',
    target: '將軍弛勞，酒肉慰勞。',
  },
  {
    source: '$shuliang:2',
    target: '將軍，牌來了！',
  },

  {
    source: '$jimeng:1',
    target: '今日之言，皆是爲保兩國無虞。',
  },
  {
    source: '$jimeng:2',
    target: '天下之勢已如水火，還望重修盟好。',
  },
  {
    source: '$shuaiyan:1',
    target: '並魏之日，想來便是兩國征戰之時。',
  },
  {
    source: '$shuaiyan:2',
    target: '在下所言，至誠至率！',
  },

  {
    source: '$xuewei:1',
    target: '吾主之尊，豈容爾等賊寇近前？',
  },
  {
    source: '$xuewei:2',
    target: '血佑忠魂，身衛英主。',
  },
  {
    source: '$liechi:1',
    target: '吾受漢帝恩，豈容吳賊辱？',
  },
  {
    source: '$liechi:2',
    target: '漢將有死無降，怎會如吳狗一般？',
  },

  {
    source: '$dujin:1',
    target: '帶兵十萬，不如老夫奪甲一件！',
  },
  {
    source: '$dujin:2',
    target: '輕舟獨進，破敵先鋒！',
  },

  {
    source: '$yingjian:1',
    target: '翩翩一雲端，仿若桃花仙。',
  },
  {
    source: '$yingjian:2',
    target: '沒牌，又有何不可能的？',
  },
  {
    source: '$shixin:1',
    target: '釋懷之戾氣，化君之不悅。',
  },
  {
    source: '$shixin:2',
    target: '星星之火，安能傷我？',
  },

  {
    source: '$zhaohan:1',
    target: '天道昭昭，再興，如光武，亦可期。',
  },
  {
    source: '$zhaohan:2',
    target: '漢祚將終，我又豈能無憾？',
  },
  {
    source: '$rangjie:1',
    target: '公既執掌權柄，又何必令君臣遭亂？',
  },
  {
    source: '$rangjie:2',
    target: '公雖權傾朝野，亦當遵聖上之意。',
  },
  {
    source: '$mobile_yizheng:1',
    target: '一人劫天子，一人制公卿，此可行邪？',
  },
  {
    source: '$mobile_yizheng:2',
    target: '諸君舉事，當上順天心，奈何如是！',
  },

  {
    source: '$jinfan:1',
    target: '揚錦帆，劫四方，快意逍遙！',
  },
  {
    source: '$jinfan:2',
    target: '鈴聲所至之處，再無安寧！',
  },
  {
    source: '$sheque:1',
    target: '看我此箭，取那輕舟冒進之人性命！',
  },
  {
    source: '$sheque:2',
    target: '縱有勁甲良盾，也難擋我神射之威！',
  },

  {
    source: '$taomie:1',
    target: '犯我遼東疆界，必遭後報！',
  },
  {
    source: '$taomie:2',
    target: '韓濊之亂，再無可生之機。',
  },
  {
    source: '$taomie:3',
    target: '顱且遠行萬里，要席何用？',
  },

  {
    source: '$zhengnan:1',
    target: '末將願承父志，隨丞相出征。',
  },
  {
    source: '$zhengnan:2',
    target: '此番南征，必平父願。',
  },
  {
    source: '$dangxian.guansuo:1',
    target: '各位將軍，且讓小輩先行出戰。',
  },
  {
    source: '$wusheng.guansuo:1',
    target: '逆賊！可識得關氏之勇？',
  },
  {
    source: '$zhiman.guansuo:1',
    target: '蠻夷可撫，不可剿。',
  },
];

export const promptDescriptions: Word[] = [
  {
    source: '{0}: do you want to put at least 1 hand card on your general card as ‘liang’?',
    target: '{0}；你可以將至少一張手牌置爲“糧”',
  },

  {
    source: '{0}: do you want to remove a ‘liang’ to let {1} draws 2 cards?',
    target: '{0}；你可以移去一張“糧”，令 {1} 摸兩張牌',
  },

  {
    source: '{0}: you need to give a card to {1}, otherwise the damage to {1} will be terminated',
    target: '{0}；請交給 {1} 一張可選牌，否則將防止對 {1} 的傷害',
  },

  {
    source: '{0}: you can choose a card to gain. If you do this, {1} can deal 1 damage to you',
    target: '{0}；你可以獲得其中一張牌。若如此做，{1} 可以對你造成1點傷害',
  },

  {
    source: '{0}: do you want to use a slash to {1} (this slash ignores armors)?',
    target: '{0}；你可以對 {1} 使用一張無視防具的【殺】',
  },

  {
    source: '{0}: do you want to choose a target to draw 2 cards? If he is wounded, you draw 1 card',
    target: '{0}；你可以令一名角色摸兩張牌，若其已受傷，你摸一張牌',
  },

  {
    source:
      '{0}: do you want to use this skill, discard all your hand cards, then let {1} recover to 1 hp, and deal 1 damage to current player?',
    target: '{0}；你可以發動本技能，棄置所有手牌，令 {1} 回覆體力至1點，然後對當前回合角色造成1點傷害',
  },

  {
    source: 'jimeng {0}: do you want to prey a card from another player?',
    target: '{0}；你可以獲得一名其他角色一張牌，然後交給其等同於你體力值數量的牌',
  },
  {
    source: '{0}: please give {1} {2} card(s)',
    target: '{0}；請交給 {1} {2} 張牌',
  },

  {
    source: '{0}: do you want to display all your hand cards to let another player give you a card?',
    target: '{0}；你可以展示所有手牌，令一名其他角色交給你一張牌',
  },
  {
    source: '{0}: please give {1} a card',
    target: '{0}；請交給 {1} 一張牌',
  },

  {
    source: '{0}: do you want to choose a Xue Wei target?',
    target: '{0}；請選擇一名其他角色作爲“血衛”的目標',
  },

  {
    source: '{0}: do you want to use this skill to {1} ?',
    target: '{0}；你可以對 {1} 發動本技能',
  },
  {
    source: '{0}: please choose taomie options: {1}',
    target: '{0}；請選擇令此對 {1} 造成的傷害+1，或獲得其 {1} 區域內的一張牌',
  },
  { source: 'taomie:damage', target: '傷害+1' },
  { source: 'taomie:prey', target: '獲得其牌' },
  { source: 'taomie:both', target: '執行前兩項並移去其標記' },

  {
    source: '{0}: please choose rangjie options',
    target: '{0}；請選擇以下一項',
  },
  { source: 'rangjie:move', target: '移動場上一張牌' },
  { source: 'rangjie:gain', target: '隨機獲得指定類別的牌' },
  {
    source: 'rangjie: please move a card on the game board',
    target: '讓節：請移動場上一張牌',
  },

  {
    source: 'shanli: please choose a target to gain a lord skill',
    target: '擅立：請選擇一名角色獲得一項由你選擇的主公技（三選一）',
  },
  {
    source: '{0}: please choose shanli options: {1}',
    target: '{0}：請選擇以下一項主公技，令 {1} 獲得',
  },
];
