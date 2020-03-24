import { CardId } from 'core/cards/libs/card_props';
import { Sanguosha } from 'core/game/engine';
import { INFINITE_TRIGGERING_TIMES } from 'core/game/game_props';
import { CommonSkill, RulesBreakerSkill } from 'core/skills/skill';

@CommonSkill
export class ZhuGeLianNuSlashSkill extends RulesBreakerSkill {
  constructor() {
    super('zhugeliannu', 'zhugeliannu_description');
  }
  public breakCardUsableTimes(cardId: CardId) {
    if (Sanguosha.getCardById(cardId).GeneralName === 'lightning') {
      return INFINITE_TRIGGERING_TIMES;
    } else {
      return 0;
    }
  }
}
