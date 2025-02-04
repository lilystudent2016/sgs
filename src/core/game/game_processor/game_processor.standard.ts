import { Card, CardType, VirtualCard } from 'core/cards/card';
import { EquipCard } from 'core/cards/equip_card';
import { CardMatcher } from 'core/cards/libs/card_matcher';
import { CardId } from 'core/cards/libs/card_props';
import { Character, CharacterGender, CharacterId, CharacterNationality } from 'core/characters/character';
import {
  CardDrawReason,
  CardMoveArea,
  CardMovedBySpecifiedReason,
  CardMoveReason,
  ClientEventFinder,
  GameEventIdentifiers,
  ServerEventFinder,
} from 'core/event/event';
import { MoveCardEventInfos, MovingCardProps } from 'core/event/event.server';
import { EventPacker } from 'core/event/event_packer';
import { Sanguosha } from 'core/game/engine';
import {
  CardEffectStage,
  CardMoveStage,
  CardUseStage,
  ChainLockStage,
  DamageEffectStage,
  DrawCardStage,
  GameEventStage,
  HpChangeStage,
  JudgeEffectStage,
  LoseHpStage,
  PhaseChangeStage,
  PhaseStageChangeStage,
  PlayerDiedStage,
  PlayerDyingStage,
  PlayerPhase,
  PlayerPhaseStages,
  RecoverEffectStage,
  SkillEffectStage,
  SkillUseStage,
  StageProcessor,
  TurnOverStage,
} from 'core/game/stage_processor';
import { Player } from 'core/player/player';
import { PlayerCardsArea, PlayerId, PlayerInfo, PlayerRole } from 'core/player/player_props';
import { TimeLimitVariant } from 'core/room/room';
import { ServerRoom } from 'core/room/room.server';
import { Algorithm } from 'core/shares/libs/algorithm';
import { Functional } from 'core/shares/libs/functional';
import { Logger } from 'core/shares/libs/logger/logger';
import { Precondition } from 'core/shares/libs/precondition/precondition';
import { TargetGroupUtil } from 'core/shares/libs/utils/target_group';
import { Flavor } from 'core/shares/types/host_config';
import { GameMode } from 'core/shares/types/room_props';
import { GlobalFilterSkill, SkillLifeCycle } from 'core/skills/skill';
import { TranslationPack } from 'core/translations/translation_json_tool';
import { DamageType } from '../game_props';
import { GameProcessor } from './game_processor';

export class StandardGameProcessor extends GameProcessor {
  protected playerPositionIndex = 0;
  protected room: ServerRoom;
  protected currentPlayerStage: PlayerPhaseStages | undefined;
  protected currentPlayerPhase: PlayerPhase | undefined;
  protected currentPhasePlayer: Player;
  protected currentProcessingStage: GameEventStage | undefined;
  protected currentProcessingEvent: ServerEventFinder<GameEventIdentifiers> | undefined;
  protected playerStages: PlayerPhaseStages[] = [];

  protected toEndPhase: PlayerPhase | undefined;
  protected inExtraRound: boolean = false;
  protected inExtraPhase: boolean = false;
  protected playRoundInsertions: PlayerId[] = [];
  protected playPhaseInsertions: {
    player: PlayerId;
    phase: PlayerPhase;
  }[] = [];
  protected dumpedLastPlayerPositionIndex: number = -1;

  private readonly DamageTypeTag = 'damageType';
  private readonly BeginnerTag = 'beginnerOfTheDamage';
  protected proposalCharacters: string[] = [];

  constructor(protected stageProcessor: StageProcessor, protected logger: Logger) {
    super();
  }

  public assignRoles(players: Player[]) {
    const roles = this.getRoles(players.length);
    Algorithm.shuffle(roles);
    for (let i = 0; i < players.length; i++) {
      players[i].Role = roles[i];
    }
    const lordIndex = players.findIndex(player => player.Role === PlayerRole.Lord);
    if (lordIndex !== 0) {
      [players[0], players[lordIndex]] = [players[lordIndex], players[0]];
      [players[0].Position, players[lordIndex].Position] = [players[lordIndex].Position, players[0].Position];
    }
  }

  public fixCurrentPosition(playerPosition: number) {
    this.playerPositionIndex = playerPosition;
  }

  protected async askForChoosingNationalities(playerId: PlayerId) {
    const askForNationality = EventPacker.createUncancellableEvent<GameEventIdentifiers.AskForChoosingOptionsEvent>({
      options: ['wei', 'shu', 'wu', 'qun'],
      toId: playerId,
      conversation: 'please choose a nationality',
    });

    this.room.notify(GameEventIdentifiers.AskForChoosingOptionsEvent, askForNationality, playerId);

    const nationalityResponse = await this.room.onReceivingAsyncResponseFrom(
      GameEventIdentifiers.AskForChoosingOptionsEvent,
      playerId,
    );

    return nationalityResponse;
  }

  public getWinners(players: Player[]) {
    const rebellion: Player[] = [];
    let renegade: Player | undefined;
    const loyalist: Player[] = [];
    let lordDied = false;

    for (const player of players) {
      if (player.Dead) {
        if (player.Role === PlayerRole.Lord) {
          lordDied = true;
        }
        continue;
      }

      switch (player.Role) {
        case PlayerRole.Lord:
        case PlayerRole.Loyalist:
          loyalist.push(player);
          break;
        case PlayerRole.Rebel:
          rebellion.push(player);
          break;
        case PlayerRole.Renegade:
          renegade = player;
          break;
        default:
      }
    }

    if (lordDied) {
      if (rebellion.length > 0) {
        return players.filter(player => player.Role === PlayerRole.Rebel);
      } else if (renegade) {
        return [renegade];
      }
    } else if (renegade === undefined && rebellion.length === 0) {
      return players.filter(player => player.Role === PlayerRole.Lord || player.Role === PlayerRole.Loyalist);
    }
  }

  public getRoles(totalPlayers: number): PlayerRole[] {
    switch (totalPlayers) {
      case 2:
        return [PlayerRole.Lord, PlayerRole.Rebel];
      case 3:
        return [PlayerRole.Lord, PlayerRole.Rebel, PlayerRole.Renegade];
      case 4:
        return [PlayerRole.Lord, PlayerRole.Rebel, PlayerRole.Loyalist, PlayerRole.Renegade];
      case 5:
        return [PlayerRole.Lord, PlayerRole.Rebel, PlayerRole.Rebel, PlayerRole.Loyalist, PlayerRole.Renegade];
      case 6:
        return [
          PlayerRole.Lord,
          PlayerRole.Rebel,
          PlayerRole.Rebel,
          PlayerRole.Rebel,
          PlayerRole.Loyalist,
          PlayerRole.Renegade,
        ];
      case 7:
        return [
          PlayerRole.Lord,
          PlayerRole.Rebel,
          PlayerRole.Rebel,
          PlayerRole.Rebel,
          PlayerRole.Loyalist,
          PlayerRole.Loyalist,
          PlayerRole.Renegade,
        ];
      case 8:
        return [
          PlayerRole.Lord,
          PlayerRole.Rebel,
          PlayerRole.Rebel,
          PlayerRole.Rebel,
          PlayerRole.Rebel,
          PlayerRole.Loyalist,
          PlayerRole.Loyalist,
          PlayerRole.Renegade,
        ];
      default:
        throw new Error('Unable to create roles with invalid number of players');
    }
  }

  protected getSelectableCharacters(
    selectable: number,
    selectableCharacters: Character[],
    selected: CharacterId[],
    filter?: (characer: Character) => boolean,
  ) {
    const canChooseAllCharacters =
      this.room.Flavor === Flavor.Dev || (this.room.GameInfo.campaignMode && this.room.GameInfo.allowAllCharacters);
    if (canChooseAllCharacters) {
      return Sanguosha.getAllCharacters();
    } else {
      return Sanguosha.getRandomCharacters(selectable, selectableCharacters, selected, filter);
    }
  }

  // Someone choose Special Character, return the character
  // Use for Lord or Boss
  protected async chooseSpecialCharacters(
    playerInfo: PlayerInfo,
    selectableCharacters: Character[],
    playerRole: PlayerRole,
  ) {
    this.room.broadcast(GameEventIdentifiers.CustomGameDialog, {
      translationsMessage: TranslationPack.translationJsonPatcher(
        '{0} is {1}, waiting for selecting a character',
        playerInfo.Name,
        Functional.getPlayerRoleRawText(playerRole, GameMode.Standard),
      ).extract(),
    });

    const chooseCharacterEvent: ServerEventFinder<GameEventIdentifiers.AskForChoosingCharacterEvent> = {
      amount: 1,
      characterIds: [...selectableCharacters.map(character => character.Id)],
      toId: playerInfo.Id,
      translationsMessage: TranslationPack.translationJsonPatcher(
        'your role is {0}, please choose a lord',
        Functional.getPlayerRoleRawText(playerInfo.Role!, GameMode.Standard),
      ).extract(),
    };

    this.room.notify(GameEventIdentifiers.AskForChoosingCharacterEvent, chooseCharacterEvent, playerInfo.Id);

    const playerResp = await this.room.onReceivingAsyncResponseFrom(
      GameEventIdentifiers.AskForChoosingCharacterEvent,
      playerInfo.Id,
    );

    return Sanguosha.getCharacterById(playerResp.chosenCharacterIds[0]);
  }

  // Some Players Choose Character, return the characters
  protected async sequentialChooseCharacters(
    playersInfo: PlayerInfo[],
    selectableCharacters: Character[],
    selectedCharacters: Character[],
    lordCharacter?: Character,
  ) {
    const sequentialAsyncResponse: Promise<ClientEventFinder<GameEventIdentifiers.AskForChoosingCharacterEvent>>[] = [];
    const notifyOtherPlayer: PlayerId[] = playersInfo.map(info => info.Id);
    this.room.doNotify(notifyOtherPlayer);

    selectedCharacters.push(
      ...this.proposalCharacters.map(characterName => Sanguosha.getCharacterByCharaterName(characterName)),
    );

    for (const playerInfo of playersInfo) {
      const characterName = Algorithm.shuffle(this.proposalCharacters).pop();
      const extraCharacters = characterName ? [Sanguosha.getCharacterByCharaterName(characterName)] : [];

      const candCharacters = this.getSelectableCharacters(
        5 - extraCharacters.length,
        selectableCharacters,
        selectedCharacters.map(character => character.Id),
      );

      selectedCharacters = [...candCharacters, ...selectedCharacters];

      const translationsMessage =
        lordCharacter !== undefined
          ? TranslationPack.translationJsonPatcher(
              'lord is {0}, your role is {1}, please choose a character',
              Sanguosha.getCharacterById(lordCharacter.Id).Name,
              Functional.getPlayerRoleRawText(playerInfo.Role!, GameMode.Standard),
            ).extract()
          : TranslationPack.translationJsonPatcher(
              'your role is {0}, please choose a character',
              Functional.getPlayerRoleRawText(playerInfo.Role!, GameMode.OneVersusTwo),
            ).extract();

      this.room.notify(
        GameEventIdentifiers.AskForChoosingCharacterEvent,
        {
          amount: 1,
          characterIds: extraCharacters.concat(candCharacters).map(character => character.Id),
          toId: playerInfo.Id,
          translationsMessage,
          ignoreNotifiedStatus: true,
        },
        playerInfo.Id,
      );

      sequentialAsyncResponse.push(
        this.room.onReceivingAsyncResponseFrom(GameEventIdentifiers.AskForChoosingCharacterEvent, playerInfo.Id),
      );
    }

    const changedProperties: {
      toId: PlayerId;
      characterId?: CharacterId;
      maxHp?: number;
      hp?: number;
      nationality?: CharacterNationality;
      gender?: CharacterGender;
    }[] = [];
    const askForChooseNationalities: Promise<ClientEventFinder<GameEventIdentifiers.AskForChoosingOptionsEvent>>[] = [];
    for (const response of await Promise.all(sequentialAsyncResponse)) {
      const playerInfo = Precondition.exists(
        playersInfo.find(info => info.Id === response.fromId),
        'Unexpected player id received',
      );

      const character = Sanguosha.getCharacterById(response.chosenCharacterIds[0]);
      changedProperties.push({
        toId: playerInfo.Id,
        characterId: character.Id,
      });

      if (character.Nationality === CharacterNationality.God) {
        askForChooseNationalities.push(this.askForChoosingNationalities(playerInfo.Id));
      }
    }

    this.room.doNotify(notifyOtherPlayer);
    const godNationalityPlayers: PlayerId[] = [];
    for (const response of await Promise.all(askForChooseNationalities)) {
      const property = Precondition.exists(
        changedProperties.find(obj => obj.toId === response.fromId),
        'Unexpected player id received',
      );

      godNationalityPlayers.push(property.toId);
      property.nationality = Functional.getPlayerNationalityEnum(response.selectedOption!);
    }
    this.room.sortPlayersByPosition(godNationalityPlayers);

    this.room.changePlayerProperties({ changedProperties });
    this.room.broadcast(GameEventIdentifiers.CustomGameDialog, {
      messages: godNationalityPlayers.map(id => {
        const player = this.room.getPlayerById(id);
        return TranslationPack.translationJsonPatcher(
          '{0} select nationaliy {1}',
          TranslationPack.patchPlayerInTranslation(player),
          Functional.getPlayerNationalityText(player.Nationality),
        ).toString();
      }),
    });
  }

  protected async chooseCharacters(playersInfo: PlayerInfo[], selectableCharacters: Character[]) {
    // lord choose character
    const lordInfo = playersInfo[0];
    const stdLordCharacters = selectableCharacters.filter(character => character.isLord());
    const lordCharacters = [
      ...stdLordCharacters,
      ...this.getSelectableCharacters(
        4,
        selectableCharacters,
        stdLordCharacters.map(character => character.Id),
      ),
    ];

    const lordCharacter = await this.chooseSpecialCharacters(lordInfo, lordCharacters, PlayerRole.Lord);

    const additionalPropertyValue = playersInfo.length >= 5 ? 1 : 0;
    const playerPropertiesChangeEvent: ServerEventFinder<GameEventIdentifiers.PlayerPropertiesChangeEvent> = {
      changedProperties: [
        {
          toId: lordInfo.Id,
          characterId: lordCharacter.Id,
          maxHp: additionalPropertyValue ? lordCharacter.MaxHp + additionalPropertyValue : undefined,
          hp:
            additionalPropertyValue || lordCharacter.Hp !== lordCharacter.MaxHp
              ? lordCharacter.Hp + additionalPropertyValue
              : undefined,
          nationality:
            lordCharacter.Nationality === CharacterNationality.God
              ? Functional.getPlayerNationalityEnum(
                  (await this.askForChoosingNationalities(lordInfo.Id)).selectedOption!,
                )
              : undefined,
        },
      ],
    };

    this.room.changePlayerProperties(playerPropertiesChangeEvent);
    const lord = this.room.getPlayerById(lordInfo.Id);
    lord.Character.Nationality === CharacterNationality.God &&
      this.room.broadcast(GameEventIdentifiers.CustomGameDialog, {
        messages: [
          TranslationPack.translationJsonPatcher(
            '{0} select nationaliy {1}',
            TranslationPack.patchPlayerInTranslation(lord),
            Functional.getPlayerNationalityText(lord.Nationality),
          ).toString(),
        ],
      });

    // other player choose character
    await this.sequentialChooseCharacters(playersInfo.slice(1), selectableCharacters, [lordCharacter], lordCharacter);
  }

  protected async drawGameBeginsCards(playerInfo: PlayerInfo) {
    const cardIds = this.room.getCards(4, 'top');
    const playerId = playerInfo.Id;
    this.room.transformCard(this.room.getPlayerById(playerId), cardIds, PlayerCardsArea.HandArea);

    const drawEvent: ServerEventFinder<GameEventIdentifiers.DrawCardEvent> = {
      drawAmount: cardIds.length,
      fromId: playerId,
      askedBy: playerId,
      translationsMessage: TranslationPack.translationJsonPatcher(
        '{0} draws {1} cards',
        TranslationPack.patchPlayerInTranslation(this.room.getPlayerById(playerId)),
        4,
      ).extract(),
    };

    this.room.broadcast(GameEventIdentifiers.DrawCardEvent, drawEvent);
    this.room.broadcast(GameEventIdentifiers.MoveCardEvent, {
      infos: [
        {
          moveReason: CardMoveReason.CardDraw,
          movingCards: cardIds.map(card => ({ card, fromArea: CardMoveArea.DrawStack })),
          toArea: CardMoveArea.HandArea,
          toId: playerId,
        },
      ],
    });
    this.room
      .getPlayerById(playerId)
      .getCardIds(PlayerCardsArea.HandArea)
      .push(...cardIds);
  }

  public async beforeGameBeginPreparation() {
    if (!this.room.WaitingRoomInfo.roomInfo.fortuneCardsExchangeLimit) {
      return;
    }

    const human = this.room.Players.filter(player => !player.isSmartAI());
    const allChangeCardActions: (() => Promise<void>)[] = [];

    this.room.doNotify(
      human.map(player => player.Id),
      TimeLimitVariant.PlayPhase,
    );

    for (const player of human) {
      const fortuneCardUse: ServerEventFinder<GameEventIdentifiers.AskForFortuneCardExchangeEvent> = {
        conversation: 'do you wanna change your handcards?',
        ignoreNotifiedStatus: true,
      };

      allChangeCardActions.push(
        async (): Promise<void> => {
          let changeLimit = this.room.WaitingRoomInfo.roomInfo.fortuneCardsExchangeLimit || 0;
          while (changeLimit-- > 0) {
            this.room.notify(GameEventIdentifiers.AskForFortuneCardExchangeEvent, fortuneCardUse, player.Id);
            const resp = await this.room.onReceivingAsyncResponseFrom(
              GameEventIdentifiers.AskForFortuneCardExchangeEvent,
              player.Id,
            );

            const { doChange } = resp;
            if (!doChange) {
              return;
            }

            const handCards = player.getCardIds(PlayerCardsArea.HandArea).slice();
            const handCardsNum = handCards.length;
            player.dropCards(...handCards);
            this.room.bury(...handCards);

            const newCardIds = this.room.getCards(handCardsNum, 'top');
            player.obtainCardIds(...newCardIds);

            this.room.broadcast(GameEventIdentifiers.MoveCardEvent, {
              infos: [
                {
                  moveReason: CardMoveReason.PlaceToDropStack,
                  toArea: CardMoveArea.DropStack,
                  fromId: player.Id,
                  movingCards: handCards.map(card => ({ card, fromArea: CardMoveArea.HandArea })),
                  engagedPlayerIds: [player.Id],
                },
                {
                  moveReason: CardMoveReason.CardDraw,
                  toArea: CardMoveArea.HandArea,
                  toId: player.Id,
                  movingCards: newCardIds.map(card => ({ card, fromArea: CardMoveArea.DrawStack })),
                  engagedPlayerIds: [player.Id],
                },
              ],
              ignoreNotifiedStatus: true,
            });
          }
        },
      );
    }

    await Promise.all(allChangeCardActions.map(caller => caller()));
    this.room.shuffle();
  }

  public async gameStart(room: ServerRoom, selectableCharacters: Character[], setSelectedCharacters: () => void) {
    this.room = room;

    const playersInfo = this.room.Players.map(player => player.getPlayerInfo());
    await this.chooseCharacters(playersInfo, selectableCharacters);
    setSelectedCharacters();

    await this.beforeGameStartPreparation();
    const gameStartEvent: ServerEventFinder<GameEventIdentifiers.GameStartEvent> = {
      players: playersInfo,
    };

    await this.onHandleIncomingEvent(
      GameEventIdentifiers.GameStartEvent,
      EventPacker.createIdentifierEvent(GameEventIdentifiers.GameStartEvent, gameStartEvent),
    );

    for (const player of this.room.AlivePlayers.map(player => player.getPlayerInfo())) {
      await this.drawGameBeginsCards(player);
    }

    let lastPlayerPosition = this.playerPositionIndex;
    await this.beforeGameBeginPreparation();

    while (this.room.isPlaying() && !this.room.isGameOver() && !this.room.isClosed()) {
      if (this.room.Circle === 0) {
        this.room.nextCircle();
        await this.onHandleIncomingEvent(
          GameEventIdentifiers.GameBeginEvent,
          EventPacker.createIdentifierEvent(GameEventIdentifiers.GameBeginEvent, {}),
        );

        const circleStartEvent: ServerEventFinder<GameEventIdentifiers.CircleStartEvent> = {};
        await this.onHandleIncomingEvent(
          GameEventIdentifiers.CircleStartEvent,
          EventPacker.createIdentifierEvent(GameEventIdentifiers.CircleStartEvent, circleStartEvent),
        );
      } else if (!this.inExtraRound) {
        if (this.playerPositionIndex < lastPlayerPosition) {
          this.room.nextCircle();
          this.room.Analytics.turnToNextCircle();
          for (const player of this.room.getAlivePlayersFrom()) {
            const skillsUsed = Object.keys(player.SkillUsedHistory);
            if (skillsUsed.length > 0) {
              for (const skill of skillsUsed) {
                if (player.hasUsedSkill(skill)) {
                  const reaSkill = Sanguosha.getSkillBySkillName(skill);
                  reaSkill.isCircleSkill() && player.resetSkillUseHistory(skill);
                }
              }
            }
          }

          const circleStartEvent: ServerEventFinder<GameEventIdentifiers.CircleStartEvent> = {};
          await this.onHandleIncomingEvent(
            GameEventIdentifiers.CircleStartEvent,
            EventPacker.createIdentifierEvent(GameEventIdentifiers.CircleStartEvent, circleStartEvent),
          );
        }
        lastPlayerPosition = this.playerPositionIndex;
      }

      await this.play(this.CurrentPlayer);
      await this.turnToNextPlayer();
    }
  }

  protected async onPlayerJudgeStage(phase: PlayerPhase) {
    this.logger.debug('enter judge cards phase');
    const judgeCardIds = this.currentPhasePlayer.getCardIds(PlayerCardsArea.JudgeArea);
    for (let i = judgeCardIds.length - 1; i >= 0; i--) {
      const judgeCardId = judgeCardIds[i];
      const cardEffectEvent: ServerEventFinder<GameEventIdentifiers.CardEffectEvent> = {
        cardId: judgeCardId,
        toIds: [this.currentPhasePlayer.Id],
        nullifiedTargets: [],
        allTargets: [this.currentPhasePlayer.Id],
      };

      this.room.addProcessingCards(judgeCardId.toString(), judgeCardId);
      await this.room.moveCards({
        fromId: this.currentPhasePlayer.Id,
        movingCards: [
          {
            fromArea: CardMoveArea.JudgeArea,
            card: judgeCardId,
          },
        ],
        toArea: CardMoveArea.ProcessingArea,
        moveReason: CardMoveReason.ActiveMove,
      });

      await this.onHandleIncomingEvent(
        GameEventIdentifiers.CardEffectEvent,
        EventPacker.createIdentifierEvent(GameEventIdentifiers.CardEffectEvent, cardEffectEvent),
      );

      if (this.room.getProcessingCards(judgeCardId.toString()).length > 0) {
        await this.room.moveCards({
          movingCards: [
            {
              fromArea: CardMoveArea.ProcessingArea,
              card: judgeCardId,
            },
          ],
          toArea: CardMoveArea.DropStack,
          moveReason: CardMoveReason.PlaceToDropStack,
        });

        this.room.endProcessOnCard(judgeCardId);
      }

      if (this.toEndPhase === phase) {
        this.toEndPhase = undefined;
        break;
      }
    }
  }
  protected async onPlayerDrawCardStage(phase: PlayerPhase) {
    this.logger.debug('enter draw cards phase');
    await this.room.drawCards(2, this.currentPhasePlayer.Id, 'top', undefined, undefined, CardDrawReason.GameStage);
  }
  protected async onPlayerPlayCardStage(phase: PlayerPhase) {
    this.logger.debug('enter play cards phase');
    do {
      this.room.notify(
        GameEventIdentifiers.AskForPlayCardsOrSkillsEvent,
        {
          toId: this.currentPhasePlayer.Id,
        },
        this.currentPhasePlayer.Id,
      );
      const response = await this.room.onReceivingAsyncResponseFrom(
        GameEventIdentifiers.AskForPlayCardsOrSkillsEvent,
        this.currentPhasePlayer.Id,
      );

      if (response.end) {
        break;
      }

      if (response.eventName === GameEventIdentifiers.CardUseEvent) {
        const event = response.event as ClientEventFinder<GameEventIdentifiers.CardUseEvent>;
        const card = Sanguosha.getCardById(event.cardId);
        const targetGroup = event.toIds && [...card.Skill.targetGroupDispatcher(event.toIds)];
        await this.room.useCard({
          targetGroup,
          ...event,
        });
      } else if (response.eventName === GameEventIdentifiers.SkillUseEvent) {
        await this.room.useSkill(response.event as ClientEventFinder<GameEventIdentifiers.SkillUseEvent>);
      } else {
        const reforgeEvent = response.event as ClientEventFinder<GameEventIdentifiers.ReforgeEvent>;
        await this.room.reforge(reforgeEvent.cardId, this.room.getPlayerById(reforgeEvent.fromId));
      }

      if (this.currentPhasePlayer.Dead) {
        break;
      }
      if (this.toEndPhase === phase) {
        this.toEndPhase = undefined;
        break;
      }
    } while (!this.room.Players.every(player => !player.isOnline()));
  }
  protected async onPlayerDropCardStage(phase: PlayerPhase) {
    this.logger.debug(`${this.currentPhasePlayer.Id} enter drop cards phase`);
    const maxCardHold = this.currentPhasePlayer.getMaxCardHold(this.room);
    let discardAmount = this.currentPhasePlayer.getCardIds(PlayerCardsArea.HandArea).length - maxCardHold;
    this.logger.debug(`${this.currentPhasePlayer.Id},  Upper Limit: ${maxCardHold}`);

    const droppedCards: CardId[] = [];
    while (discardAmount > 0 && this.currentPhasePlayer.getCardIds(PlayerCardsArea.HandArea).length > 0) {
      const response = await this.room.askForCardDrop(
        this.currentPhasePlayer.Id,
        discardAmount === 1 ? discardAmount : [1, discardAmount],
        [PlayerCardsArea.HandArea],
        true,
        droppedCards,
        undefined,
        undefined,
        true,
      );

      response.droppedCards.length > 0 && droppedCards.push(...response.droppedCards);

      discardAmount = discardAmount - response.droppedCards.length;
    }

    await this.room.dropCards(CardMoveReason.SelfDrop, droppedCards, this.currentPhasePlayer.Id);
  }

  private async onPhase(phase: PlayerPhase) {
    Precondition.assert(phase !== undefined, 'Undefined phase');
    if (this.room.isClosed() || !this.room.isPlaying() || this.room.isGameOver()) {
      return;
    }

    switch (phase) {
      case PlayerPhase.JudgeStage:
        return await this.onPlayerJudgeStage(phase);
      case PlayerPhase.DrawCardStage:
        return await this.onPlayerDrawCardStage(phase);
      case PlayerPhase.PlayCardStage:
        return await this.onPlayerPlayCardStage(phase);
      case PlayerPhase.DropCardStage:
        return await this.onPlayerDropCardStage(phase);
      default:
        break;
    }
  }

  public skip(phase?: PlayerPhase) {
    if (this.inExtraPhase) {
      return;
    }

    if (phase === undefined) {
      this.playerStages = [];
    } else {
      this.toEndPhase = phase;
      this.playerStages = this.playerStages.filter(stage => !this.stageProcessor.isInsidePlayerPhase(phase, stage));
      if (
        phase !== undefined &&
        this.currentPlayerStage !== undefined &&
        this.stageProcessor.isInsidePlayerPhase(phase, this.currentPlayerStage)
      ) {
        this.currentPlayerStage = this.playerStages.shift();
      }
    }
  }

  public endPhase(phase: PlayerPhase) {
    this.toEndPhase = phase;
    this.playerStages = this.playerStages.filter(stage => !this.stageProcessor.isInsidePlayerPhase(phase, stage));
    if (
      phase !== undefined &&
      this.currentPlayerStage !== undefined &&
      this.stageProcessor.isInsidePlayerPhase(phase, this.currentPlayerStage)
    ) {
      this.currentPlayerStage = this.playerStages.shift();
    }
  }

  private readonly processingPhaseStages = [
    PlayerPhaseStages.PhaseBegin,
    PlayerPhaseStages.PrepareStage,
    PlayerPhaseStages.JudgeStage,
    PlayerPhaseStages.DrawCardStage,
    PlayerPhaseStages.PlayCardStage,
    PlayerPhaseStages.DropCardStage,
    PlayerPhaseStages.FinishStage,
    PlayerPhaseStages.PhaseFinish,
  ];

  private async play(player: Player, specifiedStages?: PlayerPhaseStages[]) {
    if (!player.isFaceUp()) {
      await this.room.turnOver(player.Id);
      return;
    }

    let lastPlayer = this.currentPhasePlayer;
    this.playerStages = specifiedStages ? specifiedStages : this.stageProcessor.createPlayerStage();
    while (this.playerStages.length > 0) {
      let nextPhase: PlayerPhase;
      if (this.playPhaseInsertions.length > 0) {
        const { phase, player: nextPlayer } = this.playPhaseInsertions.shift()!;
        nextPhase = phase;
        this.currentPhasePlayer = this.room.getPlayerById(nextPlayer);
        this.inExtraPhase = true;
        this.playerStages.unshift(...this.stageProcessor.createPlayerStage(phase));
      } else {
        this.currentPhasePlayer = player;
        nextPhase = this.stageProcessor.getInsidePlayerPhase(this.playerStages[0]);
        this.inExtraPhase = false;
      }

      for (const player of this.room.AlivePlayers) {
        if (nextPhase === PlayerPhase.PhaseBegin) {
          player.resetCardUseHistory();
          player.hasDrunk() && this.room.clearHeaded(player.Id);
        } else {
          player.resetCardUseHistory('slash');
        }

        const skillsUsed = Object.keys(player.SkillUsedHistory);
        if (skillsUsed.length > 0) {
          for (const skill of skillsUsed) {
            if (player.hasUsedSkill(skill)) {
              const reaSkill = Sanguosha.getSkillBySkillName(skill);
              if (reaSkill.isCircleSkill()) {
                continue;
              }
              if (reaSkill.isRefreshAt(this.room, player, nextPhase)) {
                reaSkill.whenRefresh(this.room, player);
                player.resetSkillUseHistory(skill);
              }
            }
          }
        }
      }

      const phaseChangeEvent = EventPacker.createIdentifierEvent(GameEventIdentifiers.PhaseChangeEvent, {
        from: this.currentPlayerPhase,
        to: nextPhase,
        fromPlayer: lastPlayer?.Id,
        toPlayer: player.Id,
      });
      await this.onHandleIncomingEvent(GameEventIdentifiers.PhaseChangeEvent, phaseChangeEvent, async stage => {
        if (this.toEndPhase === nextPhase) {
          EventPacker.terminate(phaseChangeEvent);
          this.toEndPhase = undefined;
          return false;
        }

        if (stage === PhaseChangeStage.PhaseChanged) {
          this.room.Analytics.turnToNextPhase();
          this.currentPlayerPhase = nextPhase;
          if (this.currentPlayerPhase === PlayerPhase.PhaseBegin) {
            this.room.Analytics.turnTo(this.CurrentPlayer.Id);
          }
        }

        return true;
      });

      if (EventPacker.isTerminated(phaseChangeEvent)) {
        continue;
      }

      do {
        await this.onHandleIncomingEvent(
          GameEventIdentifiers.PhaseStageChangeEvent,
          EventPacker.createIdentifierEvent(GameEventIdentifiers.PhaseStageChangeEvent, {
            toStage: this.currentPlayerStage!,
            playerId: this.currentPhasePlayer.Id,
          }),
          async stage => {
            if (
              stage === PhaseStageChangeStage.StageChanged &&
              this.processingPhaseStages.includes(this.currentPlayerStage!)
            ) {
              await this.onPhase(this.currentPlayerPhase!);
            }
            return true;
          },
        );

        this.currentPlayerStage = this.playerStages.shift();
      } while (
        this.currentPlayerStage !== undefined &&
        this.stageProcessor.isInsidePlayerPhase(this.currentPlayerPhase!, this.currentPlayerStage)
      );

      lastPlayer = this.currentPhasePlayer;
    }
  }

  private async doCardEffect(
    identifier: GameEventIdentifiers.CardEffectEvent,
    event: ServerEventFinder<GameEventIdentifiers.CardEffectEvent>,
  ) {
    const card = Sanguosha.getCardById(event.cardId);
    if (card.is(CardType.Trick)) {
      const pendingResponses: {
        [k in PlayerId]: Promise<ClientEventFinder<GameEventIdentifiers.AskForCardUseEvent>>;
      } = {};

      const notifierAllPlayers: PlayerId[] = [];
      const wuxiekejiMatcher = new CardMatcher({ name: ['wuxiekeji'] });
      for (const player of this.room.getAlivePlayersFrom(this.CurrentPlayer.Id)) {
        notifierAllPlayers.push(player.Id);
        if (
          event.disresponsiveList?.includes(player.Id) ||
          EventPacker.isDisresponsiveEvent(event, true) ||
          (!player.hasCard(this.room, wuxiekejiMatcher) &&
            this.room.GameParticularAreas.find(areaName =>
              player.hasCard(this.room, wuxiekejiMatcher, PlayerCardsArea.OutsideArea, areaName),
            ) === undefined)
        ) {
          continue;
        }

        const wuxiekejiEvent = {
          toId: player.Id,
          conversation:
            event.fromId !== undefined
              ? TranslationPack.translationJsonPatcher(
                  'do you wanna use {0} for {1} from {2}' + (event.toIds ? ' to {3}' : ''),
                  'wuxiekeji',
                  TranslationPack.patchCardInTranslation(event.cardId),
                  TranslationPack.patchPlayerInTranslation(this.room.getPlayerById(event.fromId)),
                  event.toIds
                    ? TranslationPack.patchPlayerInTranslation(
                        ...event.toIds.map(toId => this.room.getPlayerById(toId)),
                      )
                    : '',
                ).extract()
              : TranslationPack.translationJsonPatcher(
                  'do you wanna use {0} for {1}' + (event.toIds ? ' to {2}' : ''),
                  'wuxiekeji',
                  TranslationPack.patchCardInTranslation(event.cardId),
                  event.toIds
                    ? TranslationPack.patchPlayerInTranslation(
                        ...event.toIds.map(toId => this.room.getPlayerById(toId)),
                      )
                    : '',
                ).extract(),
          cardMatcher: wuxiekejiMatcher.toSocketPassenger(),
          byCardId: event.cardId,
          cardUserId: event.fromId,
          ignoreNotifiedStatus: true,
        };
        pendingResponses[player.Id] = this.room.askForCardUse(wuxiekejiEvent, player.Id);
      }

      //TODO: enable to custom wuxiekeji response time limit
      this.room.doNotify(notifierAllPlayers, TimeLimitVariant.AskForWuxiekeji);
      let cardUseEvent: ServerEventFinder<GameEventIdentifiers.CardUseEvent> | undefined;
      while (Object.keys(pendingResponses).length > 0) {
        const response = await Promise.race(Object.values(pendingResponses));
        if (response.cardId !== undefined) {
          cardUseEvent = {
            fromId: response.fromId,
            cardId: response.cardId,
            toCardIds: [event.cardId],
            responseToEvent: event,
          };
          break;
        } else {
          delete pendingResponses[response.fromId];
        }
      }

      for (const player of this.room.getAlivePlayersFrom(this.CurrentPlayer.Id)) {
        this.room.clearSocketSubscriber(identifier, player.Id);
      }

      if (cardUseEvent) {
        await this.room.useCard(cardUseEvent, true);
        if (!EventPacker.terminate(cardUseEvent) || event.isCancelledOut) {
          await this.room.trigger(event, CardEffectStage.CardEffectCancelledOut);

          event.isCancelledOut && EventPacker.terminate(event);
        }
      }
      EventPacker.isTerminated(event) && (await card.Skill.onEffectRejected(this.room, event));
    } else if (card.GeneralName === 'slash') {
      const { toIds, fromId, cardId } = event;
      const targets = Precondition.exists(toIds, 'Unable to get slash target');
      Precondition.assert(targets.length === 1, 'slash effect target should be only one target');
      const toId = targets[0];

      if (!EventPacker.isDisresponsiveEvent(event, true)) {
        const askForUseCardEvent = {
          toId,
          cardMatcher: new CardMatcher({ name: ['jink'] }).toSocketPassenger(),
          byCardId: cardId,
          cardUserId: fromId,
          triggeredBySkills: event.triggeredBySkills
            ? [...event.triggeredBySkills, card.GeneralName]
            : [card.GeneralName],
          conversation:
            fromId !== undefined
              ? TranslationPack.translationJsonPatcher(
                  '{0} used {1} to you, please use a {2} card',
                  TranslationPack.patchPlayerInTranslation(this.room.getPlayerById(fromId)),
                  TranslationPack.patchCardInTranslation(cardId),
                  'jink',
                ).extract()
              : TranslationPack.translationJsonPatcher(
                  'please use a {0} card to response {1}',
                  'jink',
                  TranslationPack.patchCardInTranslation(cardId),
                ).extract(),
          triggeredOnEvent: event,
        };

        const response = await this.room.askForCardUse(askForUseCardEvent, toId);
        if (response.cardId !== undefined) {
          const jinkUseEvent: ServerEventFinder<GameEventIdentifiers.CardUseEvent> = {
            fromId: toId,
            cardId: response.cardId,
            toCardIds: [cardId],
            responseToEvent: event,
          };
          await this.room.useCard(jinkUseEvent, true);

          if (!EventPacker.terminate(jinkUseEvent) || event.isCancelledOut) {
            await this.room.trigger(event, CardEffectStage.CardEffectCancelledOut);
            event.isCancelledOut && EventPacker.terminate(event);
          }
        }
      }
    }
  }

  public async onHandleIncomingEvent<T extends GameEventIdentifiers, E extends ServerEventFinder<T>>(
    identifier: T,
    event: E,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
  ): Promise<void> {
    if (this.room.isClosed() || !this.room.isPlaying() || this.room.isGameOver()) {
      return;
    }

    const processingEvent = this.currentProcessingEvent;
    this.currentProcessingEvent = event;

    switch (identifier) {
      case GameEventIdentifiers.PhaseChangeEvent:
        await this.onHandlePhaseChangeEvent(
          identifier as GameEventIdentifiers.PhaseChangeEvent,
          event as any,
          onActualExecuted,
        );
        break;
      case GameEventIdentifiers.PhaseStageChangeEvent:
        await this.onHandlePhaseStageChangeEvent(
          identifier as GameEventIdentifiers.PhaseStageChangeEvent,
          event as any,
          onActualExecuted,
        );
        break;
      case GameEventIdentifiers.GameStartEvent:
        await this.onHandleGameStartEvent(
          identifier as GameEventIdentifiers.GameStartEvent,
          event as any,
          onActualExecuted,
        );
        break;
      case GameEventIdentifiers.GameBeginEvent:
        await this.onHandleGameBeginEvent(
          identifier as GameEventIdentifiers.GameBeginEvent,
          event as any,
          onActualExecuted,
        );
        break;
      case GameEventIdentifiers.CircleStartEvent:
        await this.onHandleCircleStartEvent(
          identifier as GameEventIdentifiers.CircleStartEvent,
          event as any,
          onActualExecuted,
        );
        break;
      case GameEventIdentifiers.CardUseEvent:
        await this.onHandleCardUseEvent(
          identifier as GameEventIdentifiers.CardUseEvent,
          event as any,
          onActualExecuted,
        );
        break;
      case GameEventIdentifiers.DamageEvent:
        await this.onHandleDamgeEvent(identifier as GameEventIdentifiers.DamageEvent, event as any, onActualExecuted);
        break;
      case GameEventIdentifiers.PinDianEvent:
        await this.onHandlePinDianEvent(event as any, onActualExecuted);
        break;
      case GameEventIdentifiers.DrawCardEvent:
        await this.onHandleDrawCardEvent(
          identifier as GameEventIdentifiers.DrawCardEvent,
          event as any,
          onActualExecuted,
        );
        break;
      case GameEventIdentifiers.CardEffectEvent:
        await this.onHandleCardEffectEvent(
          identifier as GameEventIdentifiers.CardEffectEvent,
          event as any,
          onActualExecuted,
        );
        break;
      case GameEventIdentifiers.CardResponseEvent:
        await this.onHandleCardResponseEvent(
          identifier as GameEventIdentifiers.CardResponseEvent,
          event as any,
          onActualExecuted,
        );
        break;
      case GameEventIdentifiers.MoveCardEvent:
        await this.onHandleMoveCardEvent(
          identifier as GameEventIdentifiers.MoveCardEvent,
          event as any,
          onActualExecuted,
        );
        break;
      case GameEventIdentifiers.SkillUseEvent:
        await this.onHandleSkillUseEvent(
          identifier as GameEventIdentifiers.SkillUseEvent,
          event as any,
          onActualExecuted,
        );
        break;
      case GameEventIdentifiers.SkillEffectEvent:
        await this.onHandleSkillEffectEvent(
          identifier as GameEventIdentifiers.SkillEffectEvent,
          event as any,
          onActualExecuted,
        );
        break;
      case GameEventIdentifiers.JudgeEvent:
        await this.onHandleJudgeEvent(identifier as GameEventIdentifiers.JudgeEvent, event as any, onActualExecuted);
        break;
      case GameEventIdentifiers.LoseHpEvent:
        await this.onHandleLoseHpEvent(identifier as GameEventIdentifiers.LoseHpEvent, event as any, onActualExecuted);
        break;
      case GameEventIdentifiers.RecoverEvent:
        await this.onHandleRecoverEvent(
          identifier as GameEventIdentifiers.RecoverEvent,
          event as any,
          onActualExecuted,
        );
        break;
      case GameEventIdentifiers.PlayerTurnOverEvent:
        await this.onHandlePlayerTurnOverEvent(
          identifier as GameEventIdentifiers.PlayerTurnOverEvent,
          event as any,
          onActualExecuted,
        );
        break;
      case GameEventIdentifiers.PlayerDiedEvent:
        await this.onHandlePlayerDiedEvent(
          identifier as GameEventIdentifiers.PlayerDiedEvent,
          event as any,
          onActualExecuted,
        );
        break;
      case GameEventIdentifiers.PlayerDyingEvent:
        await this.onHandleDyingEvent(
          identifier as GameEventIdentifiers.PlayerDyingEvent,
          event as any,
          onActualExecuted,
        );
        break;
      case GameEventIdentifiers.HpChangeEvent:
        await this.onHandleHpChangeEvent(
          identifier as GameEventIdentifiers.HpChangeEvent,
          event as any,
          onActualExecuted,
        );
        break;
      case GameEventIdentifiers.ChainLockedEvent:
        await this.onHandleChainLockedEvent(
          identifier as GameEventIdentifiers.ChainLockedEvent,
          event as any,
          onActualExecuted,
        );
        break;
      case GameEventIdentifiers.LevelBeginEvent:
        await this.onHandleLevelBeginEvent(
          identifier as GameEventIdentifiers.LevelBeginEvent,
          event as any,
          onActualExecuted,
        );
        break;
      default:
        throw new Error(`Unknown incoming event: ${identifier}`);
    }

    this.currentProcessingEvent = processingEvent;

    return;
  }

  protected readonly isTerminated = (event: ServerEventFinder<GameEventIdentifiers>) =>
    EventPacker.isTerminated(event) || this.room.isClosed();

  protected iterateEachStage = async <T extends GameEventIdentifiers>(
    identifier: T,
    event: ServerEventFinder<GameEventIdentifiers>,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
    processor?: (stage: GameEventStage) => Promise<void>,
  ) => {
    let processingStage: GameEventStage | undefined = this.stageProcessor.involve(identifier);
    while (true) {
      if (this.isTerminated(event)) {
        this.stageProcessor.skipEventProcess();
        break;
      }

      this.currentProcessingStage = processingStage;
      await this.room.trigger<typeof event>(event, this.currentProcessingStage);
      this.currentProcessingStage = processingStage;
      if (this.isTerminated(event)) {
        this.stageProcessor.skipEventProcess();
        break;
      }

      if (onActualExecuted) {
        this.currentProcessingStage = processingStage;
        await onActualExecuted(processingStage!);
        this.currentProcessingStage = processingStage;
      }
      if (this.isTerminated(event)) {
        this.stageProcessor.skipEventProcess();
        break;
      }

      if (processor) {
        this.currentProcessingStage = processingStage;
        await processor(processingStage);
        this.currentProcessingStage = processingStage;
      }
      if (this.isTerminated(event)) {
        this.stageProcessor.skipEventProcess();
        break;
      }

      const nextStage = this.stageProcessor.popStage();
      if (nextStage) {
        processingStage = nextStage;
      } else {
        break;
      }
    }
  };

  private async onHandleDrawCardEvent(
    identifier: GameEventIdentifiers.DrawCardEvent,
    event: ServerEventFinder<GameEventIdentifiers.DrawCardEvent>,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
  ) {
    const from = this.room.getPlayerById(event.fromId);
    return await this.iterateEachStage(identifier, event, onActualExecuted, async stage => {
      if (from.Dead) {
        EventPacker.terminate(event);
        return;
      }

      if (stage === DrawCardStage.CardDrawing && event.drawAmount > 0) {
        if (!event.translationsMessage) {
          event.translationsMessage = TranslationPack.translationJsonPatcher(
            '{0} draws {1} cards',
            TranslationPack.patchPlayerInTranslation(from),
            event.drawAmount,
          ).extract();
        }
        this.room.broadcast(identifier, event);

        const drawedCards = this.room.getCards(event.drawAmount, event.from || 'top');
        await this.room.moveCards({
          movingCards: drawedCards.map(cardId => ({ card: cardId, fromArea: CardMoveArea.DrawStack })),
          toId: event.fromId,
          toArea: CardMoveArea.HandArea,
          moveReason: CardMoveReason.CardDraw,
          hideBroadcast: true,
          movedByReason: event.triggeredBySkills ? event.triggeredBySkills[0] : undefined,
        });
      }
    });
  }

  private async onHandleDamgeEvent(
    identifier: GameEventIdentifiers.DamageEvent,
    event: ServerEventFinder<GameEventIdentifiers.DamageEvent>,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
  ) {
    event.fromId = event.fromId ? (this.room.getPlayerById(event.fromId).Dead ? undefined : event.fromId) : undefined;
    return await this.iterateEachStage(identifier, event, onActualExecuted, async (stage: GameEventStage) => {
      if (stage === DamageEffectStage.DamageDone && !this.room.getPlayerById(event.toId).Dead) {
        const { toId, damage, damageType, fromId } = event;
        const from = fromId ? this.room.getPlayerById(fromId) : undefined;
        const to = this.room.getPlayerById(toId);

        event.translationsMessage = !from
          ? TranslationPack.translationJsonPatcher(
              '{0} got hurt for {1} hp with {2} property',
              TranslationPack.patchPlayerInTranslation(this.room.getPlayerById(toId)),
              damage,
              damageType,
            ).extract()
          : TranslationPack.translationJsonPatcher(
              '{0} hits {1} {2} hp of damage type {3}',
              TranslationPack.patchPlayerInTranslation(from),
              TranslationPack.patchPlayerInTranslation(this.room.getPlayerById(toId)),
              damage,
              damageType,
            ).extract();

        const hpChangeEvent: ServerEventFinder<GameEventIdentifiers.HpChangeEvent> = {
          fromId,
          toId,
          amount: damage,
          byReaon: 'damage',
          byCardIds: event.cardIds,
        };
        EventPacker.addMiddleware(
          {
            tag: this.DamageTypeTag,
            data: event.damageType,
          },
          hpChangeEvent,
        );
        EventPacker.addMiddleware(
          {
            tag: this.BeginnerTag,
            data: event.beginnerOfTheDamage,
          },
          hpChangeEvent,
        );
        EventPacker.createIdentifierEvent(GameEventIdentifiers.HpChangeEvent, hpChangeEvent);
        await this.onHandleIncomingEvent(GameEventIdentifiers.HpChangeEvent, hpChangeEvent, async hpChangeStage => {
          if (hpChangeStage === HpChangeStage.HpChanging) {
            this.room.broadcast(identifier, event);
          }
          return true;
        });
        event.beginnerOfTheDamage = hpChangeEvent.beginnerOfTheDamage;
        EventPacker.copyPropertiesTo(hpChangeEvent, event);
        if (EventPacker.isTerminated(event)) {
          return;
        }

        const dyingEvent: ServerEventFinder<GameEventIdentifiers.PlayerDyingEvent> = {
          dying: to.Id,
          killedBy: event.fromId,
          killedByCards: event.cardIds,
          triggeredBySkills: event.triggeredBySkills,
        };

        if (to.Hp <= 0) {
          await this.onHandleIncomingEvent(
            GameEventIdentifiers.PlayerDyingEvent,
            EventPacker.createIdentifierEvent(GameEventIdentifiers.PlayerDyingEvent, dyingEvent),
          );
        }
      } else if (stage === DamageEffectStage.AfterDamagedEffect) {
        if (event.beginnerOfTheDamage === event.toId) {
          await this.onChainedDamage(event);
        }
      }
    });
  }

  private async onChainedDamage(event: ServerEventFinder<GameEventIdentifiers.DamageEvent>) {
    if (event.isFromChainedDamage) {
      return;
    }

    const { fromId, toId, cardIds, damage, damageType, triggeredBySkills, beginnerOfTheDamage } = event;
    for (const player of this.room.getOtherPlayers(toId)) {
      if (player.ChainLocked) {
        await this.room.damage({
          fromId,
          toId: player.Id,
          cardIds,
          damage,
          damageType,
          triggeredBySkills,
          isFromChainedDamage: true,
          beginnerOfTheDamage,
        });
      }
    }
  }

  private async onHandleDyingEvent(
    identifier: GameEventIdentifiers.PlayerDyingEvent,
    event: ServerEventFinder<GameEventIdentifiers.PlayerDyingEvent>,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
  ) {
    const { dying, killedBy, killedByCards } = event;
    const to = this.room.getPlayerById(dying);
    this.room.broadcast(GameEventIdentifiers.PlayerDyingEvent, {
      dying: to.Id,
      translationsMessage: TranslationPack.translationJsonPatcher(
        '{0} is dying',
        TranslationPack.patchPlayerInTranslation(to),
      ).extract(),
      killedByCards,
    });

    to.Dying = true;
    await this.iterateEachStage(identifier, event, onActualExecuted, async stage => {
      if (stage === PlayerDyingStage.PlayerDying) {
        const filterSkills = this.room.AlivePlayers.reduce<
          {
            player: Player;
            skills: GlobalFilterSkill[];
          }[]
        >((skills, player) => {
          skills.push({
            player,
            skills: player.getSkills<GlobalFilterSkill>('globalFilter'),
          });
          return skills;
        }, []);

        for (const player of this.room.getAlivePlayersFrom()) {
          event.rescuer = player.Id;
          await this.room.trigger(event, PlayerDyingStage.RequestRescue);
          event.rescuer = undefined;

          if (to.Hp > 0) {
            break;
          }

          if (
            filterSkills.find(
              ({ skills, player: owner }) =>
                skills.find(
                  skill =>
                    !skill.canUseCardTo(
                      new CardMatcher({ name: player.Id !== to.Id ? ['peach'] : ['peach', 'alcohol'] }),
                      this.room,
                      owner,
                      player,
                      to,
                    ),
                ) !== undefined,
            )
          ) {
            continue;
          }

          let continueRequest = true;
          while (continueRequest && to.Hp <= 0) {
            continueRequest = false;
            const response = await this.room.askForPeach({
              fromId: player.Id,
              toId: to.Id,
              conversation: TranslationPack.translationJsonPatcher(
                '{0} asks for {1} peach',
                TranslationPack.patchPlayerInTranslation(to),
                1 - to.Hp,
              ).extract(),
            });

            if (response && response.cardId !== undefined) {
              continueRequest = true;
              const cardUseEvent: ServerEventFinder<GameEventIdentifiers.CardUseEvent> = {
                fromId: response.fromId,
                cardId: response.cardId,
                targetGroup: [[to.Id]],
              };
              EventPacker.copyPropertiesTo(response, cardUseEvent);

              await this.room.useCard(cardUseEvent, true);
            }
          }

          if (to.Hp > 0) {
            break;
          }
        }

        if (to.Hp <= 0) {
          await this.room.kill(to, killedBy, killedByCards);
        }
      }
    });
  }

  protected async onHandlePlayerDiedEvent(
    identifier: GameEventIdentifiers.PlayerDiedEvent,
    event: ServerEventFinder<GameEventIdentifiers.PlayerDiedEvent>,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
  ) {
    const deadPlayer = this.room.getPlayerById(event.playerId);
    await this.iterateEachStage(identifier, event, onActualExecuted, async stage => {
      if (stage === PlayerDiedStage.PrePlayerDied) {
        this.room.broadcast(identifier, event);
        deadPlayer.bury();

        const winners = this.room.getGameWinners();
        if (winners) {
          let winner = winners.find(player => player.Role === PlayerRole.Lord);
          if (winner === undefined) {
            winner = winners.find(player => player.Role === PlayerRole.Rebel);
          }
          if (winner === undefined) {
            winner = winners.find(player => player.Role === PlayerRole.Renegade);
          }

          this.stageProcessor.clearProcess();
          this.playerStages = [];
          this.room.gameOver();
          this.room.broadcast(GameEventIdentifiers.GameOverEvent, {
            translationsMessage: TranslationPack.translationJsonPatcher(
              'game over, winner is {0}',
              Functional.getPlayerRoleRawText(winner!.Role, GameMode.Standard),
            ).extract(),
            winnerIds: winners.map(winner => winner.Id),
            loserIds: this.room.Players.filter(player => !winners.includes(player)).map(player => player.Id),
          });
        }
      } else if (stage === PlayerDiedStage.PlayerDied) {
        const { killedBy, playerId } = event;
        await this.room.moveCards({
          moveReason: CardMoveReason.SelfDrop,
          fromId: playerId,
          movingCards: deadPlayer
            .getPlayerCards()
            .map(cardId => ({ card: cardId, fromArea: deadPlayer.cardFrom(cardId) })),
          toArea: CardMoveArea.DropStack,
        });

        const outsideCards = Object.entries(deadPlayer.getOutsideAreaCards()).reduce<CardId[]>(
          (allCards, [areaName, cards]) => {
            if (!deadPlayer.isCharacterOutsideArea(areaName)) {
              allCards.push(...cards);
            }
            return allCards;
          },
          [],
        );

        const allCards = [...deadPlayer.getCardIds(PlayerCardsArea.JudgeArea), ...outsideCards];
        await this.room.moveCards({
          moveReason: CardMoveReason.PlaceToDropStack,
          fromId: playerId,
          movingCards: allCards.map(cardId => ({ card: cardId, fromArea: deadPlayer.cardFrom(cardId) })),
          toArea: CardMoveArea.DropStack,
        });

        this.room.getPlayerById(playerId).clearMarks();
        this.room.getPlayerById(playerId).clearFlags();

        if (killedBy) {
          const killer = this.room.getPlayerById(killedBy);

          if (deadPlayer.Role === PlayerRole.Rebel && !killer.Dead) {
            await this.room.drawCards(3, killedBy, 'top', undefined, undefined, CardDrawReason.KillReward);
          } else if (deadPlayer.Role === PlayerRole.Loyalist && killer.Role === PlayerRole.Lord) {
            const lordCards = VirtualCard.getActualCards(killer.getPlayerCards());
            await this.room.moveCards({
              moveReason: CardMoveReason.SelfDrop,
              fromId: killer.Id,
              movingCards: lordCards.map(cardId => ({ card: cardId, fromArea: killer.cardFrom(cardId) })),
              toArea: CardMoveArea.DropStack,
            });
          }
        }
      }
    });

    if (!this.room.isGameOver() && this.room.CurrentPhasePlayer.Id === event.playerId) {
      await this.room.skip(event.playerId);
    }
  }

  private async onHandleSkillUseEvent(
    identifier: GameEventIdentifiers.SkillUseEvent,
    event: ServerEventFinder<GameEventIdentifiers.SkillUseEvent>,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
  ) {
    return await this.iterateEachStage(identifier, event, onActualExecuted, async stage => {
      event.toIds = event.toIds && this.room.deadPlayerFilters(event.toIds);
      if (stage === SkillUseStage.SkillUsing) {
        if (!event.translationsMessage && !Sanguosha.isShadowSkillName(event.skillName)) {
          event.translationsMessage = TranslationPack.translationJsonPatcher(
            '{0} used skill {1}' + (event.toIds && event.toIds.length > 0 ? ' to {2}' : ''),
            TranslationPack.patchPlayerInTranslation(this.room.getPlayerById(event.fromId)),
            event.skillName,
            event.toIds
              ? TranslationPack.patchPlayerInTranslation(...event.toIds!.map(to => this.room.getPlayerById(to)))
              : '',
          ).extract();
        }
        if (Sanguosha.isShadowSkillName(event.skillName)) {
          event.mute = true;
        }
        const skill = Sanguosha.getSkillBySkillName(event.skillName);
        await skill.onUse(this.room, event);
        event.animation = event.animation || skill.getAnimationSteps(event);
      } else if (stage === SkillUseStage.AfterSkillUsed) {
        this.room.broadcast(identifier, event);
      }
    });
  }
  private async onHandleSkillEffectEvent(
    identifier: GameEventIdentifiers.SkillEffectEvent,
    event: ServerEventFinder<GameEventIdentifiers.SkillEffectEvent>,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
  ) {
    return await this.iterateEachStage(identifier, event, onActualExecuted, async stage => {
      event.toIds = event.toIds && this.room.deadPlayerFilters(event.toIds);
      if (stage === SkillEffectStage.SkillEffecting) {
        const { skillName } = event;
        await Sanguosha.getSkillBySkillName(skillName).onEffect(this.room, event);
      }
    });
  }

  private async onHandleCardEffectEvent(
    identifier: GameEventIdentifiers.CardEffectEvent,
    event: ServerEventFinder<GameEventIdentifiers.CardEffectEvent>,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
  ) {
    const card = Sanguosha.getCardById(event.cardId);
    return await this.iterateEachStage(identifier, event, onActualExecuted, async stage => {
      event.toIds = event.toIds && this.room.deadPlayerFilters(event.toIds);
      event.allTargets = event.allTargets && this.room.deadPlayerFilters(event.allTargets);

      if (event.toIds && (event.toIds.length === 0 || event.nullifiedTargets!.includes(event.toIds[0]))) {
        EventPacker.terminate(event);
        return;
      }

      if (stage === CardEffectStage.PreCardEffect) {
        await this.doCardEffect(identifier, event);
      }

      if (event.toIds && (event.toIds.length === 0 || event.nullifiedTargets!.includes(event.toIds[0]))) {
        EventPacker.terminate(event);
        return;
      }

      if (stage === CardEffectStage.CardEffecting) {
        await card.Skill.onEffect(this.room, event);
      }
    });
  }

  private async onHandleCardUseEvent(
    identifier: GameEventIdentifiers.CardUseEvent,
    event: ServerEventFinder<GameEventIdentifiers.CardUseEvent>,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
  ) {
    const from = this.room.getPlayerById(event.fromId);
    const card = Sanguosha.getCardById(event.cardId);

    if (!event.translationsMessage) {
      if (card.is(CardType.Equip)) {
        event.translationsMessage = TranslationPack.translationJsonPatcher(
          '{0} equipped {1}',
          TranslationPack.patchPlayerInTranslation(from),
          TranslationPack.patchCardInTranslation(event.cardId),
        ).extract();
      } else {
        event.translationsMessage = TranslationPack.translationJsonPatcher(
          '{0} used card {1}' + (event.targetGroup || event.toCardIds ? ' to {2}' : ''),
          TranslationPack.patchPlayerInTranslation(from),
          TranslationPack.patchCardInTranslation(event.cardId),
          event.targetGroup
            ? TranslationPack.patchPlayerInTranslation(
                ...TargetGroupUtil.getRealTargets(event.targetGroup).map(id => this.room.getPlayerById(id)),
              )
            : event.toCardIds
            ? TranslationPack.patchCardInTranslation(...event.toCardIds)
            : '',
        ).extract();
      }
    }

    if (!card.is(CardType.Equip)) {
      event.animation = event.animation || card.Skill.getAnimationSteps(event);
    }
    this.room.broadcast(identifier, event);
    event.translationsMessage = undefined;

    if (!this.room.isCardOnProcessing(event.cardId)) {
      this.room.addProcessingCards(event.cardId.toString(), event.cardId);
      await this.room.moveCards({
        movingCards: [{ card: event.cardId, fromArea: event.customFromArea || from.cardFrom(event.cardId) }],
        toArea: CardMoveArea.ProcessingArea,
        fromId: from.Id,
        moveReason: CardMoveReason.CardUse,
      });
    }

    if (!event.withoutInvokes) {
      await this.iterateEachStage(identifier, event, onActualExecuted);

      await this.room.trigger(event, CardUseStage.CardUseFinishedEffect);

      if (this.room.isCardOnProcessing(event.cardId)) {
        await this.room.moveCards({
          movingCards: [{ card: event.cardId, fromArea: CardMoveArea.ProcessingArea }],
          moveReason: CardMoveReason.CardUse,
          toArea: CardMoveArea.DropStack,
          hideBroadcast: true,
          proposer: event.fromId,
        });
      }
      this.room.endProcessOnTag(card.Id.toString());
    }
  }

  private async onHandleCardResponseEvent(
    identifier: GameEventIdentifiers.CardResponseEvent,
    event: ServerEventFinder<GameEventIdentifiers.CardResponseEvent>,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
  ) {
    const from = this.room.getPlayerById(event.fromId);

    if (!event.translationsMessage) {
      event.translationsMessage = TranslationPack.translationJsonPatcher(
        '{0} responses card {1}',
        TranslationPack.patchPlayerInTranslation(this.room.getPlayerById(event.fromId)),
        TranslationPack.patchCardInTranslation(event.cardId),
      ).extract();
    }
    this.room.broadcast(GameEventIdentifiers.CardResponseEvent, event);
    event.translationsMessage = undefined;

    if (!this.room.isCardOnProcessing(event.cardId)) {
      this.room.addProcessingCards(event.cardId.toString(), event.cardId);
      await this.room.moveCards({
        movingCards: [{ card: event.cardId, fromArea: from.cardFrom(event.cardId) }],
        toArea: CardMoveArea.ProcessingArea,
        fromId: event.fromId,
        moveReason: CardMoveReason.CardResponse,
        hideBroadcast: true,
      });
    }

    if (
      event.responseToEvent &&
      EventPacker.getIdentifier(event.responseToEvent) === GameEventIdentifiers.CardEffectEvent
    ) {
      const cardEffectEvent = event.responseToEvent as ServerEventFinder<GameEventIdentifiers.CardEffectEvent>;
      cardEffectEvent.cardIdsResponded = cardEffectEvent.cardIdsResponded || [];
      cardEffectEvent.cardIdsResponded.push(event.cardId);
    }

    await this.iterateEachStage(identifier, event, onActualExecuted);

    if (!event.withoutInvokes) {
      if (this.room.isCardOnProcessing(event.cardId)) {
        await this.room.moveCards({
          movingCards: [{ card: event.cardId, fromArea: CardMoveArea.ProcessingArea }],
          moveReason: CardMoveReason.CardResponse,
          toArea: CardMoveArea.DropStack,
          hideBroadcast: true,
          proposer: event.fromId,
        });
      }
      this.room.endProcessOnTag(event.cardId.toString());
    }
  }

  private async onHandleMoveCardEvent(
    identifier: GameEventIdentifiers.MoveCardEvent,
    event: ServerEventFinder<GameEventIdentifiers.MoveCardEvent>,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
  ) {
    const moveCardInfos: MoveCardEventInfos[] = [];
    for (const info of event.infos) {
      const { fromId, toId, movingCards, toArea } = info;
      let to = toId ? this.room.getPlayerById(toId) : undefined;
      if (to && toArea === CardMoveArea.EquipArea) {
        const droppedMoves: MovingCardProps[] = [];
        const equipMoves: MovingCardProps[] = [];

        for (const moving of movingCards) {
          if (to!.canEquip(Sanguosha.getCardById(moving.card))) {
            equipMoves.push(moving);
          } else {
            droppedMoves.push(moving);
          }
        }

        if (droppedMoves.length > 0) {
          moveCardInfos.push({
            ...info,
            movingCards: droppedMoves,
            toArea: CardMoveArea.DropStack,
            moveReason: CardMoveReason.PlaceToDropStack,
          });
          if (equipMoves.length > 0) {
            moveCardInfos.push({ ...info, movingCards: equipMoves });
          }

          continue;
        }
      } else if (to && (to.Dead || (toArea === CardMoveArea.JudgeArea && to.judgeAreaDisabled()))) {
        info.toId = undefined;
        info.toArea = CardMoveArea.DropStack;
        info.moveReason = CardMoveReason.PlaceToDropStack;
        to = undefined;
      }

      const from = fromId ? this.room.getPlayerById(fromId) : undefined;
      const cardIds = movingCards.reduce<CardId[]>((cards, cardInfo) => {
        if (!cardInfo.asideMove) {
          cards.push(cardInfo.card);
        }
        return cards;
      }, []);
      const actualCardIds = VirtualCard.getActualCards(cardIds);

      this.createCardMoveMessage(from, to, cardIds, actualCardIds, info);

      moveCardInfos.push(info);
    }

    if (moveCardInfos.length === 0) {
      return;
    }

    event.infos = moveCardInfos;

    return await this.iterateEachStage(identifier, event, onActualExecuted, async stage => {
      if (stage === CardMoveStage.CardMoving) {
        for (const info of event.infos) {
          const { fromId, toId, movingCards } = info;
          const from = fromId ? this.room.getPlayerById(fromId) : undefined;
          const to = toId ? this.room.getPlayerById(toId) : undefined;

          const cardIds = movingCards.reduce<CardId[]>((cards, cardInfo) => {
            if (!cardInfo.asideMove) {
              cards.push(cardInfo.card);
            }
            return cards;
          }, []);
          const actualCardIds = VirtualCard.getActualCards(cardIds);

          await this.moveCardInGameboard(from, to, cardIds, actualCardIds, info);
        }

        this.room.broadcast(identifier, event);
      } else if (stage === CardMoveStage.AfterCardMoved) {
        for (const info of event.infos) {
          if (!info.fromId) {
            continue;
          }

          const from = this.room.getPlayerById(info.fromId);
          const movingEquips = info.movingCards.filter(cardInfo => cardInfo.fromArea === PlayerCardsArea.EquipArea);

          for (const cardInfo of movingEquips) {
            await SkillLifeCycle.executeHookOnLosingSkill(Sanguosha.getCardById(cardInfo.card).Skill, this.room, from);
          }
        }
      }
    });
  }

  public createCardMoveMessage(
    from: Player | undefined,
    to: Player | undefined,
    cardIds: CardId[],
    actualCardIds: CardId[],
    event: MoveCardEventInfos,
  ) {
    const {
      fromId,
      toArea,
      toId,
      movingCards,
      moveReason,
      hideBroadcast,
      placeAtTheBottomOfDrawStack,
      isOutsideAreaInPublic,
      proposer,
    } = event;

    if (!hideBroadcast) {
      if (from) {
        event.messages = event.messages || [];
        const cards = movingCards.map(cardInfo => cardInfo.card);
        if (moveReason === CardMoveReason.PlaceToDropStack) {
          event.messages.push(
            TranslationPack.translationJsonPatcher(
              '{0} has been placed into drop stack from {1}',
              TranslationPack.patchCardInTranslation(...VirtualCard.getActualCards(cards)),
              TranslationPack.patchPlayerInTranslation(from),
            ).toString(),
          );
        } else if (moveReason === CardMoveReason.PlaceToDrawStack) {
          event.messages.push(
            TranslationPack.translationJsonPatcher(
              `{0} has been placed on the ${placeAtTheBottomOfDrawStack ? 'bottom' : 'top'} of draw stack from {1}`,
              TranslationPack.patchCardInTranslation(...VirtualCard.getActualCards(cards)),
              TranslationPack.patchPlayerInTranslation(from),
            ).toString(),
          );
        } else {
          const lostCards = movingCards
            .filter(cardInfo => cardInfo.fromArea === CardMoveArea.EquipArea)
            .map(cardInfo => cardInfo.card);
          if (lostCards.length > 0) {
            event.messages.push(
              TranslationPack.translationJsonPatcher(
                '{0} lost card {1}',
                TranslationPack.patchPlayerInTranslation(from),
                TranslationPack.patchCardInTranslation(...VirtualCard.getActualCards(lostCards)),
              ).toString(),
            );
          }
        }

        const moveOwnedCards = movingCards
          .filter(cardInfo => cardInfo.fromArea === CardMoveArea.HandArea)
          .map(cardInfo => cardInfo.card);
        if ([CardMoveReason.SelfDrop, CardMoveReason.PassiveDrop].includes(moveReason) && moveOwnedCards.length > 0) {
          event.messages.push(
            TranslationPack.translationJsonPatcher(
              '{0} drops cards {1}' + (proposer !== undefined && proposer !== fromId ? ' by {2}' : ''),
              TranslationPack.patchPlayerInTranslation(from),
              TranslationPack.patchCardInTranslation(...moveOwnedCards),
              proposer !== undefined ? TranslationPack.patchPlayerInTranslation(this.room.getPlayerById(proposer)) : '',
            ).toString(),
          );
        } else if (
          ![CardMoveReason.CardUse, CardMoveReason.CardResponse].includes(moveReason) &&
          moveOwnedCards.length > 0 &&
          fromId !== toId
        ) {
          event.messages.push(
            TranslationPack.translationJsonPatcher(
              '{0} lost {1} cards',
              TranslationPack.patchPlayerInTranslation(from),
              moveOwnedCards.length,
            ).toString(),
          );
        }
      }

      if (!event.translationsMessage && to) {
        if (toArea === PlayerCardsArea.HandArea) {
          if (!event.engagedPlayerIds) {
            event.engagedPlayerIds = [];
            fromId && event.engagedPlayerIds.push(fromId);
            toId && event.engagedPlayerIds.push(toId);
          }

          event.translationsMessage = TranslationPack.translationJsonPatcher(
            '{0} obtains cards {1}' + (fromId ? ' from {2}' : ''),
            TranslationPack.patchPlayerInTranslation(to),
            TranslationPack.patchCardInTranslation(...actualCardIds),
            fromId ? TranslationPack.patchPlayerInTranslation(this.room.getPlayerById(fromId)) : '',
          ).extract();

          event.unengagedMessage = TranslationPack.translationJsonPatcher(
            '{0} obtains {1} cards' + (fromId ? ' from {2}' : ''),
            TranslationPack.patchPlayerInTranslation(to),
            cardIds.length,
            fromId ? TranslationPack.patchPlayerInTranslation(this.room.getPlayerById(fromId)) : '',
          ).extract();
        } else if (toArea === PlayerCardsArea.OutsideArea) {
          if (isOutsideAreaInPublic) {
            event.translationsMessage = TranslationPack.translationJsonPatcher(
              '{0} move cards {1} onto the top of {2} character card',
              TranslationPack.patchPlayerInTranslation(to),
              TranslationPack.patchCardInTranslation(...actualCardIds),
              TranslationPack.patchPlayerInTranslation(to),
            ).extract();
          } else {
            event.engagedPlayerIds = [to.Id];
            event.unengagedMessage = TranslationPack.translationJsonPatcher(
              '{0} move {1} cards onto the top of {2} character card',
              TranslationPack.patchPlayerInTranslation(to),
              actualCardIds.length,
              TranslationPack.patchPlayerInTranslation(to),
            ).extract();
          }
        }
      }
    }
  }

  public async moveCardInGameboard(
    from: Player | undefined,
    to: Player | undefined,
    cardIds: CardId[],
    actualCardIds: CardId[],
    event: MoveCardEventInfos,
  ) {
    const { toArea, movingCards, toOutsideArea, placeAtTheBottomOfDrawStack } = event;
    for (const { card, fromArea, asideMove } of movingCards) {
      if (asideMove) {
        continue;
      } else if (fromArea === CardMoveArea.DrawStack) {
        this.room.getCardFromDrawStack(card);
      } else if (fromArea === CardMoveArea.DropStack) {
        this.room.getCardFromDropStack(card);
      } else if (fromArea === CardMoveArea.ProcessingArea) {
        this.room.endProcessOnCard(card);
      } else if (from) {
        from.dropCards(card);
      }
    }

    if (toArea === CardMoveArea.DrawStack) {
      this.room.putCards(placeAtTheBottomOfDrawStack ? 'bottom' : 'top', ...cardIds);
    } else if (toArea === CardMoveArea.DropStack) {
      this.room.bury(...cardIds);
    } else if (toArea === CardMoveArea.ProcessingArea) {
      const processingCards = cardIds.filter(cardId => !this.room.isCardOnProcessing(cardId));
      if (processingCards.length > 0) {
        this.room.addProcessingCards(processingCards.join('+'), ...processingCards);
      }
    } else if (toArea === CardMoveArea.UniqueCardArea) {
      this.room.bury(
        ...VirtualCard.getActualCards(cardIds).filter(cardId => !Sanguosha.getCardById(cardId).isUniqueCard()),
      );
    } else {
      if (to) {
        if (toArea === CardMoveArea.EquipArea) {
          this.room.transformCard(to, actualCardIds, PlayerCardsArea.EquipArea);
          for (const cardId of actualCardIds) {
            const card = Sanguosha.getCardById<EquipCard>(cardId);
            const existingEquip = to.getEquipment(card.EquipType);
            Precondition.assert(
              existingEquip === undefined,
              `Cannot move card ${cardId} to equip area since there is an existing same type of equip`,
            );
            to.equip(card);
          }
        } else if (toArea === CardMoveArea.OutsideArea) {
          to.getCardIds(
            (toArea as unknown) as PlayerCardsArea,
            Precondition.exists(toOutsideArea, 'outside area must have an area name'),
          ).push(...actualCardIds);
        } else if (toArea === CardMoveArea.HandArea) {
          this.room.transformCard(to, actualCardIds, PlayerCardsArea.HandArea);
          to.getCardIds((toArea as unknown) as PlayerCardsArea).push(...actualCardIds);
        } else {
          const transformedDelayedTricks = cardIds.map(cardId => {
            if (!Card.isVirtualCardId(cardId)) {
              return cardId;
            }

            const card = Sanguosha.getCardById<VirtualCard>(cardId);
            if (card.ActualCardIds.length === 1) {
              const originalCard = Sanguosha.getCardById(card.ActualCardIds[0]);
              if (card.Suit !== originalCard.Suit) {
                card.Suit = originalCard.Suit;
              }
              if (card.CardNumber !== originalCard.CardNumber) {
                card.CardNumber = originalCard.CardNumber;
              }
              return card.Id;
            }

            return cardId;
          });
          to.getCardIds((toArea as unknown) as PlayerCardsArea).push(...transformedDelayedTricks);
        }
      }
    }
  }

  private async onHandleJudgeEvent(
    identifier: GameEventIdentifiers.JudgeEvent,
    event: ServerEventFinder<GameEventIdentifiers.JudgeEvent>,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
  ) {
    let fromArea: CardMoveArea = CardMoveArea.DrawStack;
    const { toId, bySkill, byCard, judgeCardId } = event;

    let ownerId = this.room.getCardOwnerId(judgeCardId);
    if (ownerId) {
      const cardArea = (this.room.getPlayerById(ownerId).cardFrom(judgeCardId) as any) as CardMoveArea | undefined;
      fromArea = cardArea === undefined ? fromArea : cardArea;
    }

    const to = this.room.getPlayerById(toId);
    const outsideAreaName = to.getOutsideAreaNameOf(judgeCardId);
    if (outsideAreaName && !to.isCharacterOutsideArea(outsideAreaName)) {
      fromArea = CardMoveArea.OutsideArea;
      ownerId = toId;
    }

    await this.room.moveCards({
      movingCards: [{ card: judgeCardId, fromArea }],
      fromId: fromArea !== CardMoveArea.DrawStack ? ownerId : undefined,
      moveReason: CardMoveReason.ActiveMove,
      toArea: CardMoveArea.ProcessingArea,
      proposer: toId,
      movedByReason: CardMovedBySpecifiedReason.JudgeProcess,
      triggeredBySkills: bySkill ? [bySkill] : undefined,
    });

    await this.iterateEachStage(identifier, event, onActualExecuted, async stage => {
      if (stage === JudgeEffectStage.OnJudge) {
        this.room.broadcast(GameEventIdentifiers.CustomGameDialog, {
          translationsMessage: TranslationPack.translationJsonPatcher(
            '{0} starts a judge of {1}, judge card is {2}',
            TranslationPack.patchPlayerInTranslation(this.room.getPlayerById(event.toId)),
            byCard ? TranslationPack.patchCardInTranslation(byCard) : bySkill!,
            TranslationPack.patchCardInTranslation(event.judgeCardId),
          ).extract(),
        });
      } else if (stage === JudgeEffectStage.JudgeEffect) {
        const to = this.room.getPlayerById(toId);
        this.room.transformCard(to, event);

        event.translationsMessage = TranslationPack.translationJsonPatcher(
          '{0} got judged card {2} on {1}',
          TranslationPack.patchPlayerInTranslation(to),
          byCard ? TranslationPack.patchCardInTranslation(byCard) : bySkill!,
          TranslationPack.patchCardInTranslation(judgeCardId),
        ).extract();

        this.room.broadcast(identifier, event);
      }
    });

    if (this.room.isCardOnProcessing(event.judgeCardId)) {
      await this.room.moveCards({
        movingCards: [{ card: event.judgeCardId, fromArea: CardMoveArea.ProcessingArea }],
        moveReason: CardMoveReason.PlaceToDropStack,
        toArea: CardMoveArea.DropStack,
        proposer: event.toId,
        movedByReason: CardMovedBySpecifiedReason.JudgeProcess,
        triggeredBySkills: bySkill ? [bySkill] : undefined,
      });
    }

    this.room.endProcessOnTag(event.judgeCardId.toString());
  }

  private async onHandlePinDianEvent(
    event: ServerEventFinder<GameEventIdentifiers.PinDianEvent>,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
  ) {
    return await this.iterateEachStage(GameEventIdentifiers.PinDianEvent, event, onActualExecuted);
  }

  private async onHandlePhaseChangeEvent(
    identifier: GameEventIdentifiers.PhaseChangeEvent,
    event: ServerEventFinder<GameEventIdentifiers.PhaseChangeEvent>,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
  ) {
    return await this.iterateEachStage(identifier, event, onActualExecuted, async stage => {
      const to = this.room.getPlayerById(event.toPlayer);
      if (to.Dead) {
        this.skip();
        EventPacker.terminate(event);
      } else if (stage === PhaseChangeStage.PhaseChanged) {
        if (event.to === PlayerPhase.PhaseBegin) {
          event.messages = event.messages || [];
          event.messages.push(
            TranslationPack.translationJsonPatcher(
              '{0} round start',
              TranslationPack.patchPlayerInTranslation(to),
            ).toString(),
          );
        }
        this.room.broadcast(GameEventIdentifiers.PhaseChangeEvent, event);
      }
    });
  }

  private async onHandlePhaseStageChangeEvent(
    identifier: GameEventIdentifiers.PhaseStageChangeEvent,
    event: ServerEventFinder<GameEventIdentifiers.PhaseStageChangeEvent>,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
  ) {
    return await this.iterateEachStage(identifier, event, onActualExecuted, async stage => {
      if (this.room.getPlayerById(event.playerId).Dead) {
        this.skip();
        EventPacker.terminate(event);
      } else if (stage === PhaseStageChangeStage.StageChanged) {
        this.room.broadcast(GameEventIdentifiers.PhaseStageChangeEvent, event);
      }
    });
  }

  private async onHandleGameStartEvent(
    identifier: GameEventIdentifiers.GameStartEvent,
    event: ServerEventFinder<GameEventIdentifiers.GameStartEvent>,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
  ) {
    this.room.broadcast(GameEventIdentifiers.GameStartEvent, event);
    return await this.iterateEachStage(identifier, event, onActualExecuted);
  }

  private async onHandleGameBeginEvent(
    identifier: GameEventIdentifiers.GameBeginEvent,
    event: ServerEventFinder<GameEventIdentifiers.GameBeginEvent>,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
  ) {
    return await this.iterateEachStage(identifier, event, onActualExecuted);
  }

  private async onHandleCircleStartEvent(
    identifier: GameEventIdentifiers.CircleStartEvent,
    event: ServerEventFinder<GameEventIdentifiers.CircleStartEvent>,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
  ) {
    this.room.broadcast(GameEventIdentifiers.CircleStartEvent, event);
    return await this.iterateEachStage(identifier, event, onActualExecuted);
  }

  private async onHandleLevelBeginEvent(
    identifier: GameEventIdentifiers.LevelBeginEvent,
    event: ServerEventFinder<GameEventIdentifiers.LevelBeginEvent>,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
  ) {
    this.room.broadcast(GameEventIdentifiers.LevelBeginEvent, event);
    return await this.iterateEachStage(identifier, event, onActualExecuted);
  }

  private async onHandleLoseHpEvent(
    identifier: GameEventIdentifiers.LoseHpEvent,
    event: ServerEventFinder<GameEventIdentifiers.LoseHpEvent>,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
  ) {
    const victim = this.room.getPlayerById(event.toId);
    return await this.iterateEachStage(identifier, event, onActualExecuted, async stage => {
      if (victim.Dead) {
        EventPacker.terminate(event);
        return;
      }

      if (stage === LoseHpStage.LosingHp) {
        if (event.translationsMessage === undefined) {
          event.translationsMessage = TranslationPack.translationJsonPatcher(
            '{0} lost {1} hp',
            TranslationPack.patchPlayerInTranslation(victim),
            event.lostHp,
          ).extract();
        }

        const hpChangeEvent: ServerEventFinder<GameEventIdentifiers.HpChangeEvent> = {
          toId: victim.Id,
          amount: event.lostHp,
          byReaon: 'lostHp',
        };
        EventPacker.createIdentifierEvent(GameEventIdentifiers.HpChangeEvent, hpChangeEvent);
        await this.onHandleIncomingEvent(GameEventIdentifiers.HpChangeEvent, hpChangeEvent, async stage => {
          if (stage === HpChangeStage.HpChanging) {
            this.room.broadcast(identifier, event);
          }
          return true;
        });
        EventPacker.copyPropertiesTo(hpChangeEvent, event);
        if (EventPacker.isTerminated(event)) {
          return;
        }

        const dyingEvent: ServerEventFinder<GameEventIdentifiers.PlayerDyingEvent> = {
          dying: victim.Id,
        };

        if (victim.Hp <= 0) {
          await this.onHandleIncomingEvent(
            GameEventIdentifiers.PlayerDyingEvent,
            EventPacker.createIdentifierEvent(GameEventIdentifiers.PlayerDyingEvent, dyingEvent),
          );
        }
      }
    });
  }

  private async onHandleHpChangeEvent(
    identifier: GameEventIdentifiers.HpChangeEvent,
    event: ServerEventFinder<GameEventIdentifiers.HpChangeEvent>,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
  ) {
    const to = this.room.getPlayerById(event.toId);
    if (event.byReaon === 'damage') {
      if (to.ChainLocked && EventPacker.getMiddleware<DamageType>(this.DamageTypeTag, event) !== DamageType.Normal) {
        await this.room.chainedOn(to.Id);
        event.beginnerOfTheDamage = EventPacker.getMiddleware<string>(this.BeginnerTag, event) || to.Id;
      }
    }
    EventPacker.removeMiddleware(this.DamageTypeTag, event);
    EventPacker.removeMiddleware(this.BeginnerTag, event);

    return await this.iterateEachStage(identifier, event, onActualExecuted, async stage => {
      if (stage === HpChangeStage.HpChanging) {
        if (event.byReaon === 'recover') {
          to.changeHp(event.amount);
          if (to.Dying && to.Hp > 0) {
            to.Dying = false;
          }
        } else {
          to.changeHp(0 - event.amount);
        }
      }
    });
  }

  private async onHandleRecoverEvent(
    identifier: GameEventIdentifiers.RecoverEvent,
    event: ServerEventFinder<GameEventIdentifiers.RecoverEvent>,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
  ) {
    const to = this.room.getPlayerById(event.toId);
    return await this.iterateEachStage(identifier, event, onActualExecuted, async stage => {
      if (to.Dead) {
        EventPacker.terminate(event);
        return;
      }

      event.recoveredHp = Math.min(event.recoveredHp, to.MaxHp - to.Hp);

      if (stage === RecoverEffectStage.RecoverEffecting) {
        const hpChangeEvent: ServerEventFinder<GameEventIdentifiers.HpChangeEvent> = {
          fromId: event.recoverBy,
          toId: to.Id,
          amount: event.recoveredHp,
          byReaon: 'recover',
          byCardIds: event.cardIds,
        };
        EventPacker.createIdentifierEvent(GameEventIdentifiers.HpChangeEvent, hpChangeEvent);
        await this.onHandleIncomingEvent(GameEventIdentifiers.HpChangeEvent, hpChangeEvent, async stage => {
          if (stage === HpChangeStage.HpChanging) {
            this.room.broadcast(identifier, event);
          }
          return true;
        });
        EventPacker.copyPropertiesTo(hpChangeEvent, event);
      }
    });
  }

  private async onHandleChainLockedEvent(
    identifier: GameEventIdentifiers.ChainLockedEvent,
    event: ServerEventFinder<GameEventIdentifiers.ChainLockedEvent>,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
  ) {
    return await this.iterateEachStage(identifier, event, onActualExecuted, async stage => {
      if (stage === ChainLockStage.Chaining) {
        const player = this.room.getPlayerById(event.toId);
        player.ChainLocked = event.linked;
        this.room.broadcast(identifier, event);
      }
    });
  }

  private async onHandlePlayerTurnOverEvent(
    identifier: GameEventIdentifiers.PlayerTurnOverEvent,
    event: ServerEventFinder<GameEventIdentifiers.PlayerTurnOverEvent>,
    onActualExecuted?: (stage: GameEventStage) => Promise<boolean>,
  ) {
    return await this.iterateEachStage(identifier, event, onActualExecuted, async stage => {
      if (stage === TurnOverStage.TurningOver) {
        const player = this.room.getPlayerById(event.toId);
        player.turnOver();

        if (event.translationsMessage === undefined) {
          event.translationsMessage = TranslationPack.translationJsonPatcher(
            '{0} turned over the charactor card, who is {1} right now',
            TranslationPack.patchPlayerInTranslation(player),
            player.isFaceUp() ? 'facing up' : 'turning over',
          ).extract();
        }

        this.room.broadcast(identifier, event);
      }
    });
  }

  public insertPlayerRound(player: PlayerId) {
    this.playRoundInsertions.push(player);
  }
  public insertPlayerPhase(player: PlayerId, phase: PlayerPhase) {
    this.playPhaseInsertions.push({
      player,
      phase,
    });
  }

  public isExtraPhase() {
    return this.inExtraPhase;
  }

  public async turnToNextPlayer() {
    this.tryToThrowNotStartedError();
    this.playerStages = [];
    let chosen = false;

    if (this.playRoundInsertions.length > 0) {
      while (this.playRoundInsertions.length > 0 && !chosen) {
        const player = this.room.getPlayerById(this.playRoundInsertions.shift()!);
        if (player.Dead) {
          continue;
        } else {
          this.dumpedLastPlayerPositionIndex = this.playerPositionIndex;
          this.playerPositionIndex = player.Position;
          chosen = true;
          break;
        }
      }
    }

    this.inExtraRound = chosen;

    while (!chosen) {
      const nextIndex =
        (this.dumpedLastPlayerPositionIndex >= 0 ? this.dumpedLastPlayerPositionIndex : this.playerPositionIndex) + 1;
      this.dumpedLastPlayerPositionIndex = -1;

      this.playerPositionIndex = nextIndex % this.room.Players.length;
      chosen = !this.room.Players[this.playerPositionIndex].Dead;
    }
  }

  public get CurrentPlayer() {
    this.tryToThrowNotStartedError();
    return this.room.Players[this.playerPositionIndex];
  }
}
