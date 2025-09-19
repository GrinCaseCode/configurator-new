import styles from './Modal.module.css';
import { calcTotal } from '../../utils/priceCalculations';
import { useState } from 'react';


const validatePhone = (phone) => {
  // Правильная длина: +7-XXX-XXX-XX-XX = 16 символов
  const phoneRegex = /^\+7-\d{3}-\d{3}-\d{2}-\d{2}$/;
  return phoneRegex.test(phone) && phone.length === 16;
};

export function Modal({ item, configData, setIsModalOpen, options, config }) {
  const { name } = item;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [errors, setErrors] = useState({});
  const [phone, setPhone] = useState('+7-');

    // Функция для форматирования телефона
  const formatPhone = (value) => {
    let numbers = value.replace(/\D/g, '');
    
    if (numbers.startsWith('7')) {
      numbers = numbers.substring(1);
    }
    
    if (numbers.length > 0) {
      let formatted = '+7';
      
      if (numbers.length > 0) {
        formatted += '-' + numbers.substring(0, 3);
      }
      if (numbers.length > 3) {
        formatted += '-' + numbers.substring(3, 6);
      }
      if (numbers.length > 6) {
        formatted += '-' + numbers.substring(6, 8);
      }
      if (numbers.length > 8) {
        formatted += '-' + numbers.substring(8, 10);
      }
      
      return formatted;
    }
    
    return '+7-';
  };

  // Обработчик изменения телефона
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    const formatted = formatPhone(value);
    setPhone(formatted);
    
    // Валидация в реальном времени
    if (formatted.length === 16) { // Изменили с 17 на 16
  if (!validatePhone(formatted)) {
    setErrors(prev => ({...prev, phone: 'Неверный формат телефона'}));
  } else {
    setErrors(prev => ({...prev, phone: null}));
  }
}
  };

  const getDisplayUnit = (title) => {
    if (title.toLowerCase().includes('tb') || title.toLowerCase().includes('тб')) {
      return 'TB';
    }
    if (title.toLowerCase().includes('gb') || title.toLowerCase().includes('гб')) {
      return 'GB';
    }
    return 'GB';
  };

  const formatStorageValue = (value, unit) => {
    if (unit === 'TB') {
      return (value / 1024).toFixed(1);
    }
    return value;
  };

  const checkDependence = (property, options, config) => {
    if (!property.dependence) return true;

    const depKey = property.dependence;
    const depProp = options[depKey];
    if (!depProp) return true;

    const depConfig = config[depKey];
    let hasNet = false;

    if (depProp.multiple && Array.isArray(depConfig)) {
      hasNet = depConfig.some(d => {
        const val = depProp.values?.[d.index]?.title?.toLowerCase();
        return val === 'нет';
      });
    } else {
      const selectedIndex = depConfig?.selectedIndex ?? depConfig;
      const val = depProp.values?.[selectedIndex]?.title?.toLowerCase();
      hasNet = val === 'нет';
    }

    return !hasNet;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();


  const formData = new FormData(e.target);
  const formObject = Object.fromEntries(formData.entries());
  
  const newErrors = {};
  
  if (!formObject.name) {
    newErrors.name = 'Введите имя';
  }
  
  if (!formObject.email) {
    newErrors.email = 'Введите email';
  } else if (!/\S+@\S+\.\S+/.test(formObject.email)) {
    newErrors.email = 'Неверный формат email';
  }
  
if (!phone || phone.length < 16) { // Изменили с 17 на 16
  newErrors.phone = 'Введите полный номер телефона';
} else if (!validatePhone(phone)) {
  newErrors.phone = 'Неверный формат телефона';
}
  
  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }
  
  setIsSubmitting(true);
  setSubmitStatus(null);

    const orderData = {
      form: {
      ...formObject,
      phone: phone // Используем отформатированный телефон
    },

      configuration: {
        product: {
          id: item.id,
          name: item.name,
          basePrice: item.basePrice,
          term: item.term
        },
        selectedOptions: {},
        total: calcTotal(item, configData.nds)
      },

      selectedOptions: {}
    };

    Object.entries(options).forEach(([key, property]) => {
      if (key === 'RAM') {
        const ramConfig = config[key];
        orderData.configuration.selectedOptions[key] = {
          name: property.name,
          value: `${ramConfig.totalModules} × ${property.values[ramConfig.selectedIndex]?.title}`,
          price: property.values[ramConfig.selectedIndex]?.price * ramConfig.totalModules
        };
      } else if (Array.isArray(config[key])) {
        orderData.configuration.selectedOptions[key] = config[key].map(item => ({
          name: property.name,
          value: property.values[item.index]?.title,
          quantity: item.quantity,
          price: property.values[item.index]?.price * item.quantity
        }));
      } else {
        const selectedIndex = config[key]?.selectedIndex ?? config[key];
        orderData.configuration.selectedOptions[key] = {
          name: property.name,
          value: property.values[selectedIndex]?.title,
          price: property.values[selectedIndex]?.price
        };
      }
    });

    try {
      const response = await fetch('/local/templates/wellserver/ajax/order_submit.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (result.success) {
        setSubmitStatus('success');
        setTimeout(() => setIsModalOpen(false), 2000);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      setSubmitStatus('error');
      console.error('Ошибка отправки:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

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

          if (!checkDependence(property, options, config)) {
            return null;
          }

          if (key === 'RAM') {
            const ramConfig = config[key];
            const activeIndex = ramConfig.selectedIndex || 0;
            const activeValue = property.values[activeIndex];
            const totalModules = ramConfig.totalModules || 1;
            const totalValue = activeValue.unitValue * totalModules;
            const displayUnit = getDisplayUnit(activeValue.title);
            const formattedValue = formatStorageValue(totalValue, displayUnit);

            return (
              <div className={styles.modal__feature} key={key}>
                <span>{property.name}:</span> {formattedValue}GB <br />  {totalModules} × {displayUnit} {activeValue.title}
              </div>
            );
          }

          if (Array.isArray(config[key])) {
            const selected = config[key].filter(d => {
              const opt = property.values[d.index];
              return opt && opt.title.toLowerCase() !== 'нет';
            });

            if (selected.length === 0) return null;

            let totalSize = 0;
            const diskItems = selected.map((d, i) => {
              const itemVal = property.values[d.index];
              if (!itemVal || itemVal.title.toLowerCase() === 'нет')
                return null;

              const diskSize = itemVal.unitValue ? parseInt(itemVal.unitValue) : 0;
              const itemTotalSize = diskSize * d.quantity;
              totalSize += itemTotalSize;

              return (
                <div key={i}>
                  {d.quantity > 1 ? `${d.quantity} × ` : ''}
                  {itemVal.title}

                </div>
              );
            });

            let displayUnit = 'GB';
            let formattedTotalSize = totalSize;

            if (totalSize >= 1024) {
              displayUnit = 'TB';
              formattedTotalSize = (totalSize / 1024).toFixed(1);
            }

            return (
              <div className={styles.modal__feature} key={key}>
                <span>{property.name}:</span>{' '}
                {totalSize > 0 && (
                  <div style={{ display: 'inline' }}>
                    {formattedTotalSize} {displayUnit}
                  </div>
                )}

                {diskItems}
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
          Арендная плата в месяц с НДС {configData.nds}%: <strong>{calcTotal(item, configData.nds).withNds.toLocaleString('ru')} ₽</strong>
        </div>
        {item.term === '12m' &&
          <div className={styles.resultPrice}>
            Оплата за 12 мес. (-15%) с НДС {configData.nds}%: <strong>
              {(calcTotal(item, configData.nds).withNds * 12).toLocaleString('ru')} ₽
            </strong>
          </div>
        }

        {submitStatus === 'success' && (
          <div className={styles.successMessage}>
            Заявка отправлена успешно!
          </div>
        )}
        {submitStatus === 'error' && (
          <div className={styles.errorMessage}>
            Ошибка отправки. Попробуйте еще раз.
          </div>
        )}
        <form onSubmit={handleSubmit}>
  <div className={styles.itemForm}>
    <input 
      type="text" 
      name="name" 
      required 
      placeholder="Имя" 
      onChange={() => setErrors(prev => ({...prev, name: null}))}
    />
    {errors.name && <span className={styles.errorText}>{errors.name}</span>}
  </div>
  
  <div className={styles.itemForm}>
    <input 
      type="email" 
      name="email" 
      required 
      placeholder="E-mail"
      onChange={() => setErrors(prev => ({...prev, email: null}))}
    />
    {errors.email && <span className={styles.errorText}>{errors.email}</span>}
  </div>
  
  <div className={styles.itemForm}>
    <input 
      type="tel"
      name="phone"
      value={phone}
      onChange={handlePhoneChange}
      placeholder="+7-XXX-XXX-XX-XX"
      required
    />
    {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
  </div>
  
  <div className={styles.itemForm}>
    <textarea name="comment" placeholder="Комментарий"></textarea>
  </div>
  
  <button 
    type="submit" 
    className={styles.btnMain}
    disabled={isSubmitting}
  >
    {isSubmitting ? 'Отправка...' : 'Заказать'}
  </button>
</form>

      </div>
    </div>
  );
}