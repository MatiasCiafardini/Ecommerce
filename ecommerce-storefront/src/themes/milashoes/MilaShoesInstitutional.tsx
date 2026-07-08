"use client";

import { useState } from "react";

type FaqItem = {
  question: string;
  answer: string[];
};

const defaultFaqItems: FaqItem[] = [
  {
    question: "Hacen envios?",
    answer: ["Si, hacemos envios a todo el pais."],
  },
  {
    question: "Cual es el costo de envio?",
    answer: [
      "El costo de envio se calcula al momento de realizar la compra. Solo tenes que ingresar tu codigo postal y el sistema te mostrara las opciones disponibles, ya sea a domicilio o a sucursal.",
    ],
  },
  {
    question: "Como sigo mi envio?",
    answer: [
      "Una vez realizada la compra, vas a recibir la confirmacion por mail. Cuando el pedido sea despachado, te enviaremos un nuevo mail con el codigo de seguimiento para que puedas consultar el estado de tu envio.",
    ],
  },
  {
    question: "Cuanto tarda mi pedido?",
    answer: [
      "Una vez despachado, los envios al interior del pais suelen demorar entre 3 y 6 dias habiles. Para AMBA o CABA, el plazo aproximado es de 72 horas habiles.",
    ],
  },
  {
    question: "Como seguir mi pedido por correo?",
    answer: [
      "Los envios se realizan a traves de Correo Argentino, a domicilio o sucursal. Si elegiste sucursal, cuando el seguimiento indique en espera en sucursal, ya estara listo para retirar. Si elegiste domicilio, revisa el estado del envio para saber cuando esta en poder del distribuidor o cartero.",
      "El correo realiza una visita. Si no puede entregar el paquete, lo deja en la sucursal mas cercana para que puedas retirarlo dentro del plazo indicado. Si el paquete vuelve a origen, el nuevo envio queda a cargo del comprador.",
    ],
  },
  {
    question: "Cuales son los medios de pago?",
    answer: [
      "Aceptamos tarjetas en 3 y 6 cuotas sin interes, y tambien transferencia bancaria. Si elegis transferencia, la web te indicara el total a abonar y recibiras por mail los datos necesarios para realizar el pago.",
    ],
  },
  {
    question: "Cuando me llega?",
    answer: [
      "El plazo de preparacion del pedido puede ser de 7 a 10 dias habiles. Si elegis envio, a ese plazo se suman los tiempos del correo. Siempre intentamos despachar los pedidos lo antes posible.",
    ],
  },
  {
    question: "Puedo retirar mi pedido?",
    answer: [
      "Si. Podes retirar tu pedido coordinando previamente con nosotros por WhatsApp. Una vez abonado y preparado el pedido, nos contactaremos para coordinar dia y horario de retiro.",
      "Si no podes retirarlo personalmente, tambien podes enviar una moto, Uber o servicio similar, siempre coordinando antes. En ese caso, el traslado queda a cargo del comprador.",
    ],
  },
  {
    question: "Realizan cambios?",
    answer: [
      "Si, realizamos cambios por talle o modelo dentro de los 20 dias corridos desde que recibis el producto. Pasado ese plazo no se realizan excepciones.",
      "Los productos deben estar en buen estado y sin uso. Los costos de envio por cambios de talle o modelo quedan a cargo del comprador.",
    ],
  },
  {
    question: "Que pasa si el producto tiene una falla?",
    answer: [
      "Todos los productos son revisados antes de ser enviados. Si detectas una falla, comunicate con nosotros apenas recibas el producto para poder resolver el caso lo antes posible. En casos de falla comprobada, los costos de envio quedan a cargo de Mila Shoes.",
    ],
  },
];

const comovosyyoFaqItems: FaqItem[] = [
  {
    question: "Hacen envios?",
    answer: ["Si, hacemos envios a todo el pais."],
  },
  {
    question: "Cual es el costo de envio?",
    answer: [
      "El costo de envio se calcula al momento de realizar la compra. Solo tenes que ingresar tu codigo postal y el sistema te mostrara las opciones disponibles, ya sea a domicilio o a sucursal.",
    ],
  },
  {
    question: "Como sigo mi envio?",
    answer: [
      "Una vez realizada la compra, vas a recibir la confirmacion por mail. Cuando el pedido sea despachado, te enviaremos un nuevo mail con el codigo de seguimiento para que puedas consultar el estado de tu envio.",
    ],
  },
  {
    question: "Cuanto tarda mi pedido?",
    answer: [
      "Una vez despachado, los envios al interior del pais suelen demorar entre 3 y 6 dias habiles. Para AMBA o CABA, el plazo aproximado es de 72 horas habiles.",
    ],
  },
  {
    question: "Cuales son los medios de pago?",
    answer: [
      "Aceptamos tarjetas y transferencia bancaria. Si elegis transferencia, la web te indicara el total a abonar y recibiras por mail los datos necesarios para realizar el pago.",
    ],
  },
  {
    question: "Puedo retirar mi pedido?",
    answer: [
      "Si. Podes retirar tu pedido coordinando previamente con nosotros por WhatsApp. Una vez abonado y preparado el pedido, nos contactaremos para coordinar dia y horario de retiro.",
    ],
  },
  {
    question: "Puedo devolver un producto y solicitar el reintegro del dinero?",
    answer: [
      "No. No realizamos reembolsos. Solo aceptamos cambios dentro de los 10 dias habiles posteriores a la recepcion del pedido.",
    ],
  },
  {
    question: "Cuanto tiempo tengo para solicitar un cambio?",
    answer: [
      "Contas con 10 dias habiles desde que recibis tu compra para solicitar el cambio.",
    ],
  },
  {
    question: "Quien paga el envio del cambio?",
    answer: [
      "Los costos de envio de la devolucion y del nuevo envio corren por cuenta del cliente.",
    ],
  },
  {
    question: "En que casos puedo solicitar un cambio?",
    answer: [
      "Realizamos cambios unicamente si hubo un error en el talle, el color o si el producto recibido es diferente al que compraste.",
    ],
  },
  {
    question: "Que sucede despues de que solicito un cambio?",
    answer: [
      "Una vez aprobado, procesaremos el cambio y enviaremos el nuevo articulo.",
    ],
  },
  {
    question: "Cuanto demora en llegar el producto de cambio?",
    answer: [
      "El tiempo de entrega puede variar segun la ubicacion del cliente y el servicio de envio.",
    ],
  },
  {
    question: "Como solicito un cambio?",
    answer: [
      "Comunicate con nosotros indicando tu numero de pedido y el motivo del cambio. Te guiaremos con los pasos a seguir.",
    ],
  },
];

function resolveFaqItems(brandName: string) {
  return brandName.trim().toLowerCase() === "como vos y yo"
    ? comovosyyoFaqItems
    : defaultFaqItems;
}

export default function MilaShoesInstitutional({
  brandName = "Mila Shoes",
}: {
  brandName?: string;
}) {
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const faqListId = "milashoes-faq-list";
  const faqItems = resolveFaqItems(brandName);

  return (
    <section className="milashoes-institutional" aria-label={`Preguntas frecuentes de ${brandName}`}>
      <div className="milashoes-institutional__shell">
        <article className="milashoes-faq">
          <div className="milashoes-info-card__header milashoes-faq__header">
            <span className="milashoes-info-card__eyebrow">Ayuda</span>
            <button
              type="button"
              className="milashoes-faq__title-button"
              aria-expanded={isFaqOpen}
              aria-controls={faqListId}
              onClick={() => {
                setIsFaqOpen((current) => !current);
                setOpenIndex(null);
              }}
            >
              <span>Preguntas frecuentes</span>
              <span className="milashoes-faq__icon" aria-hidden="true">
                {isFaqOpen ? "-" : "+"}
              </span>
            </button>
          </div>

          <div
            id={faqListId}
            className="milashoes-faq__list"
            data-open={isFaqOpen ? "true" : "false"}
            aria-hidden={!isFaqOpen}
          >
            {faqItems.map((item, index) => {
              const isOpen = isFaqOpen && openIndex === index;
              const panelId = `milashoes-faq-panel-${index}`;
              const buttonId = `milashoes-faq-button-${index}`;

              return (
                <div className="milashoes-faq__item" key={item.question}>
                  <button
                    id={buttonId}
                    type="button"
                    className="milashoes-faq__button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    tabIndex={isFaqOpen ? 0 : -1}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                  >
                    <span>{item.question}</span>
                    <span className="milashoes-faq__icon" aria-hidden="true">
                      {isOpen ? "-" : "+"}
                    </span>
                  </button>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className="milashoes-faq__panel"
                    data-open={isOpen ? "true" : "false"}
                  >
                    <div className="milashoes-faq__panel-inner">
                      {item.answer.map((paragraph) => (
                        <p key={paragraph}>
                          {paragraph.replace("Mila Shoes", brandName)}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </div>
    </section>
  );
}
