import type { Metadata } from "next";
import LegalDocumentPage from "@/components/store/LegalDocumentPage";
import { getTenantConfig } from "@/lib/tenant/get-tenant";

export const metadata: Metadata = {
  title: "Politica de privacidad",
};

export default async function PoliticaDePrivacidadPage() {
  const config = await getTenantConfig();
  const brandName = config.themeLayout.footer?.brandTitle || "Nuestra tienda";
  const contactEmail =
    config.theme === "comovosyyo" ? "hola@comovosyyo.com" : "el canal de contacto publicado en el sitio";

  return (
    <LegalDocumentPage
      eyebrow={brandName}
      title="Politica de privacidad"
      updatedAt="30 de junio de 2026"
      intro={`En ${brandName} cuidamos la informacion personal de nuestros clientes y usuarios. Esta politica explica que datos podemos tratar, para que los usamos y como protegemos la informacion asociada a la experiencia de compra y administracion de catalogo.`}
      sections={[
        {
          title: "Informacion que recopilamos",
          paragraphs: [
            "Podemos recopilar datos que nos proporcionas al comprar, registrarte, iniciar sesion, contactarnos o usar funciones administrativas de la tienda. Esto puede incluir nombre, email, telefono, direccion de entrega, datos de facturacion, historial de pedidos y mensajes enviados por canales de atencion.",
            "Si inicias sesion con Google, podemos recibir datos basicos de autenticacion como nombre, direccion de correo electronico e identificador de cuenta, solo para validar tu identidad y permitir el acceso a la cuenta.",
          ],
        },
        {
          title: "Uso de Google Drive",
          paragraphs: [
            "Cuando un usuario autorizado usa el importador desde Google Drive, la aplicacion solicita acceso para seleccionar imagenes mediante Google Picker. La aplicacion solo descarga y guarda los archivos que el usuario selecciona explicitamente para incorporarlos al catalogo de productos.",
            "No revisamos, indexamos ni importamos automaticamente el contenido completo de Google Drive. Las imagenes seleccionadas pueden almacenarse como imagenes del producto dentro de la tienda para mostrarlas en el catalogo.",
            "El uso y transferencia de informacion recibida desde las APIs de Google cumple con la Google API Services User Data Policy, incluyendo los requisitos de Limited Use.",
          ],
        },
        {
          title: "Finalidades del tratamiento",
          paragraphs: [
            "Usamos la informacion para procesar compras, gestionar pagos, coordinar entregas, responder consultas, administrar cuentas, mantener la seguridad de la plataforma, mejorar la experiencia de usuario y operar el catalogo de productos.",
            "Tambien podemos usar informacion tecnica basica para prevenir abuso, diagnosticar errores, medir funcionamiento del sitio y cumplir obligaciones legales o regulatorias aplicables.",
          ],
        },
        {
          title: "Con quienes compartimos informacion",
          paragraphs: [
            "Podemos compartir datos con proveedores necesarios para operar la tienda, como servicios de hosting, procesamiento de pagos, envio, email, autenticacion, herramientas de analitica y soporte tecnico. Estos proveedores solo deben usar la informacion para prestar el servicio correspondiente.",
            "No vendemos informacion personal de clientes ni datos provenientes de Google Drive.",
          ],
        },
        {
          title: "Conservacion y eliminacion",
          paragraphs: [
            "Conservamos la informacion durante el tiempo necesario para brindar el servicio, cumplir obligaciones legales, resolver disputas, proteger la seguridad de la plataforma y mantener registros comerciales razonables.",
            "Las imagenes importadas desde Google Drive pueden eliminarse desde la administracion del catalogo o mediante una solicitud al canal de contacto correspondiente.",
          ],
        },
        {
          title: "Seguridad",
          paragraphs: [
            "Aplicamos medidas razonables para proteger la informacion contra accesos no autorizados, perdida, alteracion o divulgacion indebida. Ningun sistema es completamente infalible, pero trabajamos para mantener controles adecuados al tipo de informacion tratada.",
          ],
        },
        {
          title: "Derechos y contacto",
          paragraphs: [
            `Puedes solicitar acceso, rectificacion, actualizacion o eliminacion de tus datos escribiendo a ${contactEmail}. Tambien puedes revocar permisos concedidos a Google desde la configuracion de seguridad de tu cuenta de Google.`,
          ],
        },
      ]}
    />
  );
}
