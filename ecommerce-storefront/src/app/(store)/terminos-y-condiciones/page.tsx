import type { Metadata } from "next";
import LegalDocumentPage from "@/components/store/LegalDocumentPage";
import { getTenantConfig } from "@/lib/tenant/get-tenant";

export const metadata: Metadata = {
  title: "Terminos y condiciones",
};

export default async function TerminosYCondicionesPage() {
  const config = await getTenantConfig();
  const brandName = config.themeLayout.footer?.brandTitle || "Nuestra tienda";
  const contactEmail =
    config.theme === "comovosyyo" ? "hola@comovosyyo.com" : "el canal de contacto publicado en el sitio";

  return (
    <LegalDocumentPage
      eyebrow={brandName}
      title="Terminos y condiciones"
      updatedAt="30 de junio de 2026"
      intro={`Estos terminos regulan el uso del sitio de ${brandName}, la compra de productos y las funciones disponibles para usuarios y administradores autorizados.`}
      sections={[
        {
          title: "Uso del sitio",
          paragraphs: [
            "Al navegar o comprar en este sitio aceptas usar la plataforma de forma licita, respetuosa y conforme a estos terminos. No esta permitido intentar vulnerar la seguridad, interferir con el funcionamiento del sitio o usar informacion de terceros sin autorizacion.",
          ],
        },
        {
          title: "Cuentas y acceso",
          paragraphs: [
            "Algunas funciones pueden requerir registro o inicio de sesion. El usuario es responsable de mantener la confidencialidad de sus credenciales y de las acciones realizadas desde su cuenta.",
            "Podemos suspender o limitar accesos si detectamos uso indebido, riesgo de seguridad, fraude o incumplimiento de estos terminos.",
          ],
        },
        {
          title: "Productos, precios y stock",
          paragraphs: [
            "Las imagenes, descripciones, precios y disponibilidad de productos pueden cambiar sin previo aviso. Hacemos esfuerzos razonables para mantener la informacion actualizada, pero pueden existir errores involuntarios.",
            "Si una compra se realiza con informacion incorrecta de precio o stock, podremos contactarte para corregir la operacion, ofrecer una alternativa o cancelar el pedido con la devolucion correspondiente.",
          ],
        },
        {
          title: "Pedidos, pagos y envios",
          paragraphs: [
            "Los pedidos quedan sujetos a confirmacion de pago y disponibilidad. Los plazos de preparacion y entrega son estimados y pueden variar por causas externas, logistica, feriados, clima u otros factores fuera de nuestro control.",
            "Las condiciones especificas de cambio, devolucion o retiro se informan por los canales de atencion de la tienda y pueden depender del tipo de producto y del estado del pedido.",
          ],
        },
        {
          title: "Uso de Google Drive para administradores",
          paragraphs: [
            "Los usuarios administradores autorizados pueden seleccionar imagenes desde Google Drive para incorporarlas al catalogo de productos. Al usar esta funcion, el usuario declara tener derecho a utilizar esas imagenes en la tienda.",
            "La aplicacion solo importa los archivos seleccionados explicitamente por el usuario. El usuario es responsable de no subir contenido ilegal, ofensivo, protegido por derechos de terceros sin autorizacion o contrario a estos terminos.",
          ],
        },
        {
          title: "Propiedad intelectual",
          paragraphs: [
            "El contenido del sitio, incluyendo textos, imagenes, marcas, disenos, interfaces y elementos graficos, pertenece a sus respectivos titulares o se usa con autorizacion. No se permite copiar, reproducir o explotar el contenido sin permiso previo.",
          ],
        },
        {
          title: "Limitacion de responsabilidad",
          paragraphs: [
            "El sitio se ofrece procurando disponibilidad y funcionamiento adecuados. Sin embargo, no garantizamos que estara libre de interrupciones, errores o fallas externas. En la medida permitida por la ley, no seremos responsables por danos indirectos derivados del uso o imposibilidad de uso de la plataforma.",
          ],
        },
        {
          title: "Cambios y contacto",
          paragraphs: [
            `Podemos actualizar estos terminos cuando sea necesario. La version vigente sera la publicada en esta pagina. Para consultas, reclamos o solicitudes, puedes contactarnos mediante ${contactEmail}.`,
          ],
        },
      ]}
    />
  );
}
