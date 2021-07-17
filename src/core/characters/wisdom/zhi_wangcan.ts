import { GameCharacterExtensions } from 'core/game/game_props';
import { SkillLoader } from 'core/game/package_loader/loader.skills';
import { Character, CharacterGender, CharacterNationality, Lord } from '../character';

const skillLoaderInstance = SkillLoader.getInstance();

@Lord
export class ZhiWangCan extends Character {
  constructor(id: number) {
    super(id, 'zhi_wangcan', CharacterGender.Male, CharacterNationality.Jin, 3, 3, GameCharacterExtensions.Wisdom, [
      skillLoaderInstance.getSkillByName('zhi_qiai'),
      ...skillLoaderInstance.getSkillsByName('zhi_shanxi'),
    ]);
  }
}
