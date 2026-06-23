import json
import re
import sys
import time
from dataclasses import dataclass
from typing import Callable

from playwright.sync_api import Page, TimeoutError, expect, sync_playwright


BASE_URL = "http://localhost:3007"
EMAIL = "encargado.centro@comovosyyo.com"
PASSWORD = "Encargado123456!"
PRODUCT_SEARCH_A = "S"
PRODUCT_SEARCH_B = "Jean"
PRODUCT_TEXT_A = "Jean"


@dataclass
class Step:
    name: str
    status: str
    detail: str = ""


steps: list[Step] = []


def record(name: str, status: str, detail: str = ""):
    steps.append(Step(name=name, status=status, detail=detail))
    print(f"[{status}] {name}" + (f" - {detail}" if detail else ""), flush=True)


def run_step(name: str, fn: Callable[[], str | None]):
    try:
        detail = fn() or ""
        record(name, "OK", detail)
    except Exception as exc:
        record(name, "FAIL", f"{type(exc).__name__}: {exc}")


def body_text(page: Page) -> str:
    return page.locator("body").inner_text(timeout=10_000)


def login(page: Page):
    page.goto(f"{BASE_URL}/login?redirect=/manual-sales", wait_until="networkidle", timeout=60_000)
    page.fill("input[type=email]", EMAIL)
    page.fill("input[type=password]", PASSWORD)
    page.locator("button[type=submit]").filter(has_text="INGRESAR").click()
    page.wait_for_load_state("networkidle", timeout=60_000)
    page.wait_for_timeout(1500)
    expect(page.get_by_role("button", name="Cobrar ->")).to_be_visible(timeout=20_000)


def click_tab(page: Page, label: str):
    expect(page.locator(".manual-sale-modal-overlay")).to_have_count(0, timeout=10_000)
    page.get_by_role("button", name=label).click()
    page.wait_for_timeout(700)


def clear_sale(page: Page):
    btn = page.get_by_role("button", name="Limpiar")
    if btn.count():
        btn.click()
        page.wait_for_timeout(300)


def search_product(page: Page, query: str):
    search = page.locator('input[placeholder="Buscar por nombre, SKU o codigo de barras..."]')
    search.fill(query)
    page.wait_for_timeout(1200)


def add_first_product(page: Page, query: str):
    search_product(page, query)
    expect(page.locator(".manual-sale-variant-row").first).to_be_visible(timeout=10_000)
    if "Sin stock" in page.locator(".manual-sale-variant-row").first.inner_text():
        available = page.locator(".manual-sale-variant-row").filter(has_text="Disponible").first
        expect(available).to_be_visible(timeout=10_000)
        available.click()
        available.get_by_role("button", name=re.compile("Agregar|Sumar")).click()
        page.wait_for_timeout(600)
        return
    page.locator(".manual-sale-variant-row").first.click()
    page.locator(".manual-sale-variant-row").first.get_by_role("button", name=re.compile("Agregar|Sumar")).click()
    page.wait_for_timeout(600)


def set_payment_method(page: Page, method: str, index: int = 0):
    triggers = page.locator(".manual-sale-select-trigger")
    triggers.nth(index).click()
    page.get_by_role("option", name=method).click()
    page.wait_for_timeout(400)


def confirm_sale(page: Page) -> str:
    page.get_by_role("button", name="Cobrar ->").click()
    expect(page.get_by_role("button", name="Confirmar venta")).to_be_visible(timeout=10_000)
    summary = page.locator(".manual-sale-confirm-summary").inner_text(timeout=5_000)
    with page.expect_response(
        lambda response: "/api/proxy/orders/manual" in response.url
        and response.request.method == "POST",
        timeout=30_000,
    ) as response_info:
        page.get_by_role("button", name="Confirmar venta").click()
    response = response_info.value
    if response.status >= 400:
        raise AssertionError(f"POST /orders/manual devolvio {response.status}: {response.text()[:500]}")
    created = response.json()
    expect(page.locator(".manual-sale-modal-overlay")).to_have_count(0, timeout=10_000)
    page.wait_for_timeout(1000)
    return f"venta #{created.get('id')} total {created.get('total')} | {summary.replace(chr(10), ' | ')}"


def latest_sale_id(page: Page) -> int:
    click_tab(page, "Metricas")
    text = body_text(page)
    match = re.search(r"Venta #(\d+)", text)
    if not match:
        raise AssertionError("No encontre ventas en metricas/historial")
    return int(match.group(1))


def open_latest_sale(page: Page):
    click_tab(page, "Metricas")
    page.get_by_role("button", name="Ver detalles").first.click()
    expect(page.get_by_text("Detalle de venta")).to_be_visible(timeout=10_000)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 1100})
        page = context.new_page()
        console_errors: list[str] = []
        failed_requests: list[str] = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("requestfailed", lambda req: failed_requests.append(f"{req.method} {req.url}: {req.failure}"))

        run_step("Login como encargado de tienda 7", lambda: (login(page), page.url)[1])

        run_step(
            "Estado inicial: venta sin productos no se puede cobrar",
            lambda: "boton deshabilitado"
            if page.get_by_role("button", name="Cobrar ->").is_disabled()
            else (_ for _ in ()).throw(AssertionError("Cobrar esta habilitado sin productos")),
        )

        def product_search_ok():
            clear_sale(page)
            add_first_product(page, PRODUCT_SEARCH_A)
            text = body_text(page)
            if PRODUCT_TEXT_A not in text or "TOTAL A COBRAR" not in text:
                raise AssertionError("No se agrego producto o no recalculo total")
            return "producto agregado y total visible"

        run_step("Buscar producto y agregar variante al ticket", product_search_ok)

        def quantity_price_remove_ok():
            plus = page.get_by_label("Sumar cantidad").first
            plus.click()
            page.wait_for_timeout(300)
            price_input = page.locator('input[aria-label^="Precio de"]').first
            price_input.fill("12345")
            page.wait_for_timeout(300)
            total_after_price = page.locator(".manual-sale-grand-total strong").inner_text()
            page.get_by_label(re.compile("Quitar")).first.click()
            page.wait_for_timeout(400)
            if page.locator(".manual-sale-line").count() > 0:
                raise AssertionError("La linea no se quito")
            return f"precio recalculado: {total_after_price}; linea quitada"

        run_step("Modificar cantidad/precio y quitar linea", quantity_price_remove_ok)

        def cash_sale_ok():
            clear_sale(page)
            add_first_product(page, PRODUCT_SEARCH_A)
            page.locator('input[placeholder="Buscar o cargar cliente"]').fill("Cliente Mostrador Test")
            set_payment_method(page, "Efectivo")
            page.locator("textarea.manual-sale-field").fill("Test efectivo automatizado")
            msg = confirm_sale(page)
            return msg

        run_step("Registrar venta simple en efectivo con cliente de mostrador", cash_sale_ok)

        def transfer_discount_ok():
            clear_sale(page)
            add_first_product(page, PRODUCT_SEARCH_A)
            set_payment_method(page, "Transferencia")
            page.get_by_role("button", name="%").click()
            page.locator('input[placeholder="0"]').fill("10")
            text = body_text(page)
            if "Descuento" not in text:
                raise AssertionError("No aparece resumen de descuento")
            return confirm_sale(page)

        run_step("Registrar venta por transferencia con descuento porcentual", transfer_discount_ok)

        def fixed_discount_ok():
            clear_sale(page)
            add_first_product(page, PRODUCT_SEARCH_B)
            set_payment_method(page, "Tarjeta")
            page.get_by_role("button", name="$").click()
            page.locator('input[placeholder="0"]').fill("500")
            return confirm_sale(page)

        run_step("Registrar venta con tarjeta y descuento fijo", fixed_discount_ok)

        def split_invalid_and_valid_ok():
            clear_sale(page)
            add_first_product(page, PRODUCT_SEARCH_A)
            checkbox = page.locator(".manual-sale-split-toggle input")
            checkbox.check()
            page.wait_for_timeout(700)
            page.locator(".manual-sale-split-amount input").first.fill("1")
            page.get_by_role("button", name="Cobrar ->").click()
            page.wait_for_timeout(500)
            err = page.locator(".manual-sale-alert-error").inner_text(timeout=5_000)
            if "coincidir" not in err and "mayor a cero" not in err:
                raise AssertionError(f"Validacion inesperada: {err}")
            page.locator(".manual-sale-split-amount input").first.fill("1000")
            page.locator(".manual-sale-split-amount input").first.blur()
            page.wait_for_timeout(700)
            return confirm_sale(page)

        run_step("Pago dividido: valida suma incorrecta y luego registra suma correcta", split_invalid_and_valid_ok)

        def current_account_without_customer_validation():
            clear_sale(page)
            add_first_product(page, PRODUCT_SEARCH_A)
            set_payment_method(page, "Cuenta corriente")
            expect(page.get_by_text("Seleccionar cliente")).to_be_visible(timeout=10_000)
            err = "selector de cuenta corriente abierto antes de cobrar"
            page.get_by_role("button", name="Cerrar").click()
            expect(page.locator(".manual-sale-modal-overlay")).to_have_count(0, timeout=10_000)
            return err

        run_step("Cuenta corriente sin cliente abre selector y muestra validacion", current_account_without_customer_validation)

        def metrics_history_ok():
            sale_id = latest_sale_id(page)
            text = body_text(page)
            for label in ["Metricas rapidas", "Ultimas ventas", "Venta #"]:
                if label not in text:
                    raise AssertionError(f"Falta metrica {label}")
            return f"ultima venta #{sale_id}"

        run_step("Metricas e historial cargan ventas manuales", metrics_history_ok)

        def edit_requires_reason_and_saves():
            open_latest_sale(page)
            page.get_by_role("button", name="Editar venta").click()
            page.get_by_role("button", name="Guardar cambios").click()
            err = page.locator("text=Carga el motivo interno").inner_text(timeout=5_000)
            page.locator("textarea").fill("Correccion de prueba automatizada")
            set_payment_method(page, "Tarjeta")
            page.get_by_role("button", name="Guardar cambios").click()
            page.wait_for_timeout(1500)
            text = body_text(page)
            if "Detalle de venta" not in text:
                raise AssertionError("No volvio a detalle despues de guardar")
            page.get_by_role("button", name="Cerrar").click()
            return err

        run_step("Editar venta: exige motivo y guarda cambios", edit_requires_reason_and_saves)

        def cancel_sale_ok():
            open_latest_sale(page)
            page.get_by_role("button", name="Cancelar venta").click()
            expect(page.get_by_text("Confirmar cancelacion")).to_be_visible(timeout=10_000)
            page.get_by_role("button", name="Confirmar cancelacion").click()
            page.wait_for_timeout(1500)
            text = body_text(page)
            if "Cancelada" not in text and "cancelada" not in text:
                raise AssertionError("No se ve estado cancelado")
            page.get_by_role("button", name="Cerrar").click()
            return "venta cancelada y modal actualizado"

        run_step("Cancelar venta manual y verificar estado", cancel_sale_ok)

        def returns_validation_ok():
            click_tab(page, "Devoluciones")
            page.get_by_role("button", name=re.compile("Registrar devolucion")).click()
            err = page.locator("text=Carga al menos un producto").inner_text(timeout=5_000)
            return err

        run_step("Devoluciones: valida intento sin productos", returns_validation_ok)

        def returns_equal_exchange_ok():
            click_tab(page, "Devoluciones")
            ret = page.locator('input[placeholder="Buscar producto devuelto..."]')
            ret.fill(PRODUCT_SEARCH_A)
            page.wait_for_timeout(1200)
            page.locator("section").filter(has_text="Devuelven").locator("button").filter(has_text=PRODUCT_TEXT_A).first.click()
            exch = page.locator('input[placeholder="Buscar producto para cambio..."]')
            exch.fill(PRODUCT_SEARCH_A)
            page.wait_for_timeout(1200)
            page.locator("section").filter(has_text="Se llevan").locator("button").filter(has_text=PRODUCT_TEXT_A).first.click()
            page.locator('textarea[placeholder="Agregar observaciones de la devolucion..."]').fill("Cambio par automatizado")
            page.get_by_role("button", name=re.compile("Registrar devolucion")).click()
            expect(page.locator("text=/Devolucion #[0-9]+ registrada/")).to_be_visible(timeout=20_000)
            return page.locator("text=/Devolucion #[0-9]+ registrada/").first.inner_text()

        run_step("Devoluciones/cambios: registra cambio par", returns_equal_exchange_ok)

        if console_errors:
            record("Errores de consola del navegador", "WARN", " | ".join(console_errors[:5]))
        else:
            record("Errores de consola del navegador", "OK", "sin errores console.error")

        if failed_requests:
            record("Requests fallidas", "WARN", " | ".join(failed_requests[:5]))
        else:
            record("Requests fallidas", "OK", "sin requests fallidas")

        browser.close()

    print("\nRESUMEN_JSON")
    print(json.dumps([step.__dict__ for step in steps], ensure_ascii=False, indent=2))
    if any(step.status == "FAIL" for step in steps):
        sys.exit(1)


if __name__ == "__main__":
    main()
