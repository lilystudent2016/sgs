import classNames from 'classnames';
import { Card, CardType } from 'core/cards/card';
import { EquipCard } from 'core/cards/equip_card';
import { Sanguosha } from 'core/game/engine';
import { PlayerCardsArea } from 'core/player/player_props';
import { ClientTranslationModule } from 'core/translations/translation_module.client';
import * as mobx from 'mobx';
import * as mobxReact from 'mobx-react';
import * as React from 'react';
import { ClientCard } from '../card/card';
import { PlayerAvatar } from '../player_avatar/player_avatar';
import { RoomPresenter, RoomStore } from '../room.presenter';
import styles from './dashboard.module.css';

export type DashboardProps = {
  store: RoomStore;
  presenter: RoomPresenter;
  translator: ClientTranslationModule;
  updateFlag: boolean;
  cardEnableMatcher?(area: PlayerCardsArea): (card: Card) => boolean;
  onClick?(card: Card, selected: boolean): void;
  onClickConfirmButton?(): void;
  onClickCancelButton?(): void;
  onClickFinishButton?(): void;
};

export const EquipCardItem = mobxReact.observer(
  (props: {
    disabled?: boolean;
    card?: Card;
    translator: ClientTranslationModule;
    onClick?(selected: boolean): void;
  }) => {
    const { disabled = true, card, onClick, translator } = props;
    const selected = mobx.observable.box<boolean>(false);
    const onCardClick = mobx.action(() => {
      if (disabled === false) {
        selected.set(!selected.get());
        onClick && onClick(selected.get());
      }
    });

    return (
      <div
        className={classNames(styles.equipCardItem, {
          [styles.weapon]: card?.is(CardType.Weapon),
          [styles.armor]: card?.is(CardType.Armor),
          [styles.defenseRide]: card?.is(CardType.DefenseRide),
          [styles.offenseRide]: card?.is(CardType.OffenseRide),
        })}
        onClick={onCardClick}
      >
        {card && translator.tr(card.Name)}
      </div>
    );
  },
);

@mobxReact.observer
export class Dashboard extends React.Component<DashboardProps> {
  private readonly onClick = (card: Card) => (selected: boolean) => {
    this.props.onClick && this.props.onClick(card, selected);
  };

  getEquipCardsSection() {
    const equipCards = this.props.presenter.ClientPlayer?.getCardIds(
      PlayerCardsArea.EquipArea,
    ).map(cardId => Sanguosha.getCardById<EquipCard>(cardId));

    return (
      <>
        {equipCards && (
          <div className={styles.equipSection}>
            {equipCards.map(card => (
              <EquipCardItem
                translator={this.props.translator}
                card={card}
                onClick={this.onClick(card)}
                disabled={
                  !this.props.cardEnableMatcher ||
                  !this.props.cardEnableMatcher(PlayerCardsArea.EquipArea)(card)
                }
              />
            ))}
          </div>
        )}
      </>
    );
  }

  getAllClientHandCards() {
    return this.props.presenter.ClientPlayer?.getCardIds(
      PlayerCardsArea.HandArea,
    ).map(cardId => {
      const card = Sanguosha.getCardById(cardId);
      return (
        <ClientCard
          key={cardId}
          translator={this.props.translator}
          card={card}
          onSelected={this.onClick(card)}
          className={styles.handCard}
          disabled={
            !this.props.cardEnableMatcher ||
            !this.props.cardEnableMatcher(PlayerCardsArea.HandArea)(card)
          }
          image={''}
        />
      );
    });
  }

  getPlayerHandBoard() {
    return (
      <div className={styles.handBoard}>
        <div className={styles.userActionsButtons}>
          <button
            disabled={!this.props.store.actionButtonStatus.confirm}
            onClick={this.props.onClickConfirmButton}
          >
            {this.props.translator.tr('confirm')}
          </button>
          <button
            disabled={!this.props.store.actionButtonStatus.cancel}
            onClick={this.props.onClickCancelButton}
          >
            {this.props.translator.tr('cancel')}
          </button>
          <button
            disabled={!this.props.store.actionButtonStatus.finish}
            onClick={this.props.onClickFinishButton}
          >
            {this.props.translator.tr('finish')}
          </button>
        </div>
        <div className={styles.handCards}>{this.getAllClientHandCards()}</div>
      </div>
    );
  }

  render() {
    return (
      <div className={styles.dashboard}>
        {this.getEquipCardsSection()}
        {this.getPlayerHandBoard()}
        <PlayerAvatar
          updateFlag={this.props.store.updateUIFlag}
          onClick={this.props.store.onClickPlayer}
          store={this.props.store}
          presenter={this.props.presenter}
          translator={this.props.translator}
        />
      </div>
    );
  }
}
