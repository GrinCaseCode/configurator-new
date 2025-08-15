import styles from './Modal.module.css';
import { calcTotal, distributeRamModules } from '../../utils/priceCalculations';

export function Modal({ item, configData, setIsModalOpen, options, config }) {
  const { name } = item;

  return (
    <div className={styles.modal}>
      <div
        className={styles.modal__overlay}
        onClick={() => setIsModalOpen(false)}
      ></div>
      <div className={styles.modal__content}>
        <div
          className={styles.modal__close}
          onClick={() => setIsModalOpen(false)}
        >
          ×
        </div>
        <div className={styles.modal__title}>Форма заказа</div>
        <div className={styles.modal__feature}>
          <strong>{name}</strong>
        </div>

        {Object.entries(options).map(([key, property]) => {
          if (!property.values) return null;

          if (key === 'RAM') {
            const ramConfig = config[key];
            const totalModules = ramConfig.totalModules || 1;
            const distribution = distributeRamModules(totalModules, property.values);

            const activeIndex = (() => {
              for (let i = distribution.length - 1; i >= 0; i--) {
                if (distribution[i] > 0) return i;
              }
              return 0;
            })();

            const activeValue = property.values[activeIndex];
            const activeCount = distribution[activeIndex] || 0;
            const totalValue = property.values.reduce(
              (sum, v, i) => sum + v.unitValue * distribution[i],
              0
            );

            return (
              <div className={styles.modal__feature} key={key}>
                <span>{property.name}:</span> {totalValue} GB ({activeValue.title} × {activeCount} шт.)
              </div>
            );
          }

          if (Array.isArray(config[key])) {
            const selected = config[key].filter(d => {
              const opt = property.values[d.index];
              return opt && opt.title.toLowerCase() !== 'нет';
            });

            if (selected.length === 0) return null;

            return (
              <div className={styles.modal__feature} key={key}>
                <span>{property.name}:</span>{' '}
                {selected.map((d, i) => {
                  const itemVal = property.values[d.index];
                  if (!itemVal || itemVal.title.toLowerCase() === 'нет')
                    return null;

                  return (
                    <div key={i}>
                      {itemVal.title}
                      {d.quantity > 1 ? ` × ${d.quantity} шт.` : ''}
                    </div>
                  );
                })}
              </div>
            );
          }

          const selected = property.values[config[key]];
          if (!selected || selected.title.toLowerCase() === 'нет') return null;

          return (
            <div className={styles.modal__feature} key={key}>
              <span>{property.name}:</span> {selected.title}
            </div>
          );
        })}

        <div className={styles.resultPrice}>
          Арендная плата в месяц с НДС {configData.nds}%: <strong>{calcTotal(item, configData.nds).withNds} руб.</strong>
        </div>
        <form>
          <div className={styles.itemForm}>
            <input type="text" required placeholder="Имя" />
          </div>
          <div className={styles.itemForm}>
            <input type="email" required placeholder="E-mail" />
          </div>
          <div className={styles.itemForm}>
            <input type="tel" required placeholder="Телефон" />
          </div>
          <div className={styles.itemForm}>
            <textarea placeholder="Комментарий"></textarea>
          </div>
          <button className={styles.btnMain}>Заказать</button>
        </form>
      </div>
    </div>
  );
}