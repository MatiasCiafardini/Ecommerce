import { notFound } from "next/navigation";
import { getServerStoreContext } from "@/lib/tenant/server-store-context";

const sizeRows = [
  ["35", "22 a 22,5 cm"],
  ["36", "22,5 a 23,5 cm"],
  ["37", "23,5 a 24 cm"],
  ["38", "24 a 25 cm"],
  ["39", "25 a 25,5 cm"],
  ["40", "25,5 a 26 cm"],
  ["41", "25,9 a 26,3 cm"],
] as const;

const measureSteps = [
  "Apoya una hoja en el piso contra una pared.",
  "Parate descalza sobre la hoja.",
  "Marca desde el talon hasta el dedo mas largo.",
  "Medi la distancia en centimetros.",
  "Compara la medida con la tabla.",
];

export default async function GuiaDeTallesPage() {
  const { storeId } = await getServerStoreContext();

  if (storeId !== 6) {
    notFound();
  }

  return (
    <section className="milashoes-size-page">
      <div className="milashoes-size-page__shell">
        <div className="milashoes-size-page__intro">
          <span className="milashoes-info-card__eyebrow">Calce y medidas</span>
          <h1>Guia de talles</h1>
          <p>
            Para elegir tu talle, te sugerimos medir tu pie descalza. Coloca una hoja en el piso,
            apoya el pie encima y marca de punta a punta. Luego medi la distancia con una regla o
            centimetro.
          </p>
          <p className="milashoes-size-guide__note">
            Las medidas son aproximadas y pueden variar segun el modelo.
          </p>
        </div>

        <div className="milashoes-size-page__content">
          <div className="milashoes-size-guide__table-wrap">
            <table className="milashoes-size-guide__table">
              <thead>
                <tr>
                  <th scope="col">Talle</th>
                  <th scope="col">Medida del pie</th>
                </tr>
              </thead>
              <tbody>
                {sizeRows.map(([size, length]) => (
                  <tr key={size}>
                    <th scope="row">{size}</th>
                    <td>{length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside className="milashoes-measure-card">
            <h2>Como medir tu pie</h2>
            <ol>
              {measureSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </aside>
        </div>
      </div>
    </section>
  );
}
