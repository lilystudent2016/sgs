import { AudioLoader } from 'audio_loader/audio_loader';
import { CharacterGender } from 'core/characters/character';
import { ElectronLoader } from 'electron_loader/electron_loader';
import { CharacterSkinInfo } from 'skins/skins';

export interface AudioService {
  playSkillAudio(
    skillName: string,
    gender: CharacterGender,
    skinData: CharacterSkinInfo[],
    characterName?: string,
    skinName?: string,
  ): Promise<void>;
  playCardAudio(skillName: string, gender: CharacterGender, characterName?: string): Promise<void>;
  playDeathAudio(characterName: string, skinDara: CharacterSkinInfo[], skinName?: string): Promise<void>;
  playDamageAudio(damage: number): void;
  playLoseHpAudio(): void;
  playEquipAudio(): void;
  playChainAudio(): void;
  playRoomBGM(): void;
  playLobbyBGM(): void;
  playGameStartAudio(): void;
  stop(): void;
}

class AudioPlayerService implements AudioService {
  public audioManager: { [key: string]: HTMLAudioElement } = {};
  public playList: Set<string> = new Set<string>();
  public badResourcesList: Set<string> = new Set<string>();

  private readonly nodeNameOfLobbyBGM = 'lobby-bgm';
  private readonly nodeNameOfRoomBGM = 'room-bgm';

  constructor(private loader: AudioLoader, private electronLoader: ElectronLoader) {}

  private getFixedVolume(volumeString: string): number {
    const volume = parseInt(volumeString, 10);
    const fixedVolume = volume / 100;
    if (fixedVolume <= 0.02) {
      return 0;
    }
    return fixedVolume;
  }

  async playSkillAudio(
    skillName: string,
    gender: CharacterGender,
    skinData: CharacterSkinInfo[],
    characterName?: string,
    skinName?: string,
  ) {
    if (this.playList.has(skillName) || this.badResourcesList.has(skillName)) {
      return;
    }
    try {
      if (skinName) {
        const audioUrl = await this.loader.getCharacterSkinAudio(characterName!, skinName, skillName, skinData, gender);
        this.play(audioUrl, undefined);
      } else {
        const audioUrl = await this.loader.getSkillAudio(skillName, gender, characterName);
        this.play(audioUrl, undefined);
      }
    } catch {
      // tslint:disable-next-line: no-console
      console.warn(`The resource of '${skillName}' doesn't exist`);
      this.badResourcesList.add(skillName);
    }
  }

  async playCardAudio(cardName: string, gender: CharacterGender, characterName?: string) {
    try {
      const audioUrl = await this.loader.getCardAudio(cardName, gender, characterName);
      this.play(audioUrl);
    } catch {
      // tslint:disable-next-line: no-console
      console.warn(`The resource of '${cardName}' doesn't exist`);
    }
  }

  async playDeathAudio(characterName: string, skinData: CharacterSkinInfo[], skinName?: string) {
    try {
      if (skinName) {
        const audioUrl = await this.loader.getCharacterSkinAudio(characterName, skinName, 'death', skinData, undefined);
        this.play(audioUrl);
      } else {
        const audioUrl = await this.loader.getDeathAudio(characterName);
        this.play(audioUrl);
      }
    } catch {
      // tslint:disable-next-line: no-console
      console.warn(`The resource of '${characterName}' doesn't exist`);
    }
  }

  playDamageAudio(damage: number) {
    const audioUrl = this.loader.getDamageAudio(damage);
    this.play(audioUrl);
  }
  playLoseHpAudio() {
    this.play(this.loader.getLoseHpAudio());
  }
  playEquipAudio() {
    this.play(this.loader.getEquipAudio());
  }
  playChainAudio() {
    const chainAudioIdentifier = 'chainAudioIdentifier';
    if (this.playList.has(chainAudioIdentifier)) {
      return;
    }
    this.play(this.loader.getChainAudio(), undefined);
  }

  playRoomBGM() {
    const audioUrl = this.loader.getRoomBackgroundMusic();
    this.play(audioUrl, true, 'bgm');
  }
  playLobbyBGM() {
    const audioUrl = this.loader.getLobbyBackgroundMusic();
    this.play(audioUrl, true, 'bgm');
  }
  playGameStartAudio() {
    this.play(this.loader.getGameStartAudio());
  }

  private play(url: string, loop?: boolean, type: 'bgm' | 'game' = 'game') {
    if (this.audioManager[url] !== undefined) {
      return;
    }

    const audio = new Audio(url);
    this.audioManager[url] = audio;
    audio.loop = !!loop;

    audio.setAttribute('type', type);

    const volumeString: string = this.electronLoader.getData(type === 'bgm' ? 'mainVolume' : 'gameVolume');
    audio.volume = audio.volume = volumeString ? this.getFixedVolume(volumeString) : 0.5;

    audio.onended = () => {
      delete this.audioManager[url];
    };

    audio.play();
  }

  public stop() {
    for (const key of Object.keys(this.audioManager)) {
      this.audioManager[key].pause();
      delete this.audioManager[key];
    }
  }

  public changeBGMVolume() {
    const volumeString: string = this.electronLoader.getData('mainVolume');
    if (!volumeString) {
      return;
    }

    for (const audio of Object.values(this.audioManager)) {
      if (audio.getAttribute('type') === 'bgm') {
        audio.volume = this.getFixedVolume(volumeString);
      }
    }
  }

  public changeGameVolume() {
    const volumeString: string = this.electronLoader.getData('gameVolume');
    if (!volumeString) {
      return;
    }

    for (const audio of Object.values(this.audioManager)) {
      if (audio.getAttribute('type') === 'game') {
        audio.volume = this.getFixedVolume(volumeString);
      }
    }
  }
}

let serviceInstance: AudioPlayerService | undefined;

export function installAudioPlayerService(audioLoader: AudioLoader, electronLoader: ElectronLoader) {
  if (serviceInstance === undefined) {
    serviceInstance = new AudioPlayerService(audioLoader, electronLoader);
  }
  return serviceInstance;
}
