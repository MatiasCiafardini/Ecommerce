import json
import re
import time
from dataclasses import dataclass, field
from typing import Callable

from playwright.sync_api import Page, expect, sync_playwright


BASE_URL = "http://localhost:3007"
EMAIL = "admin@comovosyyo.com"
PASSWORD = "Admin123456!"


@dataclass
class StepResult:
    name: str
    status: str
    detail: str = ""


@dataclass
class Context:
    cash_sale_id: int | None = None
    account_sale_id: int | None = None
    edited_cash_sale_id: int | None = None
    edited_account_sale_id: int | None = None
    payment_update_status: int | None = None
    payment_cancel_status: int | None = None
    card_discount_after_edit: float | None = None
    cash_discount_after_reedit: float | None = None
    notes: list[str] = field(default_factory=list)


results: list[StepResult] = []
ctx = Context()


def record(name: str, status: str, detail: str = ""):
    results.append(StepResult(name, status, detail))
    print(f"[{status}] {name}: {detail}")


def run_step(name: str, fn: Callable[[], str | None]):
    try:
        detail = fn() or ""
        record(name, "OK", detail)
    except Exception as exc:
        record(name, "FAIL", f"{type(exc).__name__}: {exc}")
        raise


def login(page: Page):
    page.goto(f"{BASE_URL}/login?redirect=/account", wait_until="networkidle", timeout=120_000)
    page.fill("input[type=email]", EMAIL)
    page.fill("input[type=password]", PASSWORD)
    with page.expect_response(lambda r: "/api/proxy/auth/session-login" in r.url, timeout=60_000) as resp:
        page.get_by_role("button", name="INGRESAR").click()
    response = resp.value
    if response.status != 201:
        raise AssertionError(f"Login devolvio {response.status}: {response.text()[:300]}")
    page.wait_for_url("**/account", timeout=60_000)
    page.wait_for_load_state("networkidle", timeout=120_000)
    expect(page.get_by_text("Admin Como Vos y Yo")).to_be_visible(timeout=30_000)
    return "admin autenticado"


def open_manual_workspace(page: Page):
    page.get_by_role("button", name="Venta manual").first.click()
    expect(page.get_by_role("tab", name="Inicio")).to_be_visible(timeout=30_000)
    return "workspace de venta manual abierto"


def open_top_tab(page: Page, name: str):
    if name != "Cuentas corrientes":
        close_detail = page.get_by_label("Cerrar detalle")
        if close_detail.count():
            close_detail.first.click(force=True)
            page.wait_for_timeout(500)
    page.get_by_role("tab", name=name).click(force=True)
    page.wait_for_timeout(1_500)


def clear_sale_if_needed(page: Page):
    button = page.get_by_role("button", name="Limpiar")
    if button.count():
        button.click()
        page.wait_for_timeout(400)


def add_available_product(page: Page, query: str = "Jean"):
    search = page.locator('input[placeholder="Buscar por nombre, SKU o codigo de barras..."]').first
    search.fill(query)
    page.wait_for_timeout(1_800)
    row = page.locator(".manual-sale-variant-row").filter(has_text="Disponible").first
    expect(row).to_be_visible(timeout=20_000)
    product_text = row.inner_text(timeout=5_000).splitlines()[1]
    row.get_by_role("button", name="Agregar").click()
    page.wait_for_timeout(700)
    expect(page.get_by_text("TOTAL A COBRAR")).to_be_visible(timeout=10_000)
    return product_text


def confirm_current_sale(page: Page) -> int:
    page.get_by_role("button", name="Cobrar ->").click()
    expect(page.get_by_role("button", name="Confirmar venta")).to_be_visible(timeout=15_000)
    with page.expect_response(lambda r: "/api/proxy/orders/manual" in r.url and r.request.method == "POST", timeout=60_000) as resp:
        page.get_by_role("button", name="Confirmar venta").click()
    response = resp.value
    body = response.text()
    if response.status not in (200, 201):
        raise AssertionError(f"crear venta devolvio {response.status}: {body[:500]}")
    created = json.loads(body)
    page.wait_for_timeout(1_000)
    return int(created["id"])


def fill_last_visible_text_input(page: Page, value: str):
    inputs = page.locator("input")
    for index in range(inputs.count() - 1, -1, -1):
        candidate = inputs.nth(index)
        if not candidate.is_visible():
            continue
        if candidate.evaluate("element => element.type === 'checkbox'"):
            continue
        candidate.fill(value)
        return
    raise AssertionError("No encontre un input de texto visible para completar")


def create_cash_sale(page: Page):
    open_top_tab(page, "Venta manual")
    clear_sale_if_needed(page)
    product = add_available_product(page, "Jean")
    page.locator("textarea.manual-sale-field").fill("QA venta efectivo para edicion desde Caja")
    ctx.cash_sale_id = confirm_current_sale(page)
    return f"venta efectivo #{ctx.cash_sale_id} creada con {product}"


def create_current_account_sale(page: Page):
    open_top_tab(page, "Cuentas corrientes")
    page.get_by_role("button", name="Registrar venta").first.click(force=True)
    expect(page.get_by_text("Cuenta corriente seleccionada")).to_be_visible(timeout=20_000)
    product = add_available_product(page, "Jean")
    page.locator("textarea.manual-sale-field").fill("QA venta cuenta corriente para edicion")
    ctx.account_sale_id = confirm_current_sale(page)
    return f"venta cuenta corriente #{ctx.account_sale_id} creada con {product}"


def open_sales_history_from_cash(page: Page):
    open_top_tab(page, "Caja")
    page.get_by_role("button", name="Historial de ventas").click()
    expect(page.get_by_text("Historial de ventas y devoluciones")).to_be_visible(timeout=20_000)


def open_sales_history_from_dashboard(page: Page):
    open_top_tab(page, "Inicio")
    page.get_by_role("button", name=re.compile("Historial de ventas")).click()
    expect(page.get_by_text("Historial de ventas y devoluciones")).to_be_visible(timeout=20_000)


def edit_sale_in_open_history(page: Page, sale_id: int, price: int, method: str, reason: str) -> str:
    page.locator('input[placeholder="Buscar por cliente, producto, SKU, metodo o numero de venta"]').fill(str(sale_id))
    page.wait_for_timeout(1_000)
    row = page.locator("tr").filter(has_text=f"#{sale_id}").first
    expect(row).to_be_visible(timeout=15_000)
    row.get_by_role("button", name="Editar venta").click()
    expect(page.get_by_text(f"Editar venta #{sale_id}")).to_be_visible(timeout=15_000)
    page.locator("select").last.select_option(method)
    page.wait_for_timeout(500)
    discount_toggle = page.get_by_role("checkbox", name=re.compile("Aplicar descuento"))
    if method in ("Efectivo", "Transferencia"):
        expect(discount_toggle).to_be_visible(timeout=10_000)
        if not discount_toggle.is_checked():
            discount_toggle.check()
    else:
        expect(discount_toggle).to_have_count(0, timeout=10_000)
        expect(page.get_by_text("Descuento $0,00")).to_be_visible(timeout=10_000)
    page.locator('textarea[placeholder="Ej: se cargo mal el precio"]').fill(reason)
    decimal_inputs = page.locator('input[inputmode="decimal"]')
    decimal_inputs.last.fill(str(price))
    page.wait_for_timeout(300)
    displayed_total = page.get_by_text(re.compile(r"^Total \$")).last.inner_text()
    normalized_total = displayed_total.split("$")[-1].replace(".", "").replace(",", ".")
    decimal_inputs.first.fill(normalized_total)
    with page.expect_response(lambda r: f"/api/proxy/orders/manual/{sale_id}" in r.url and r.request.method == "PATCH", timeout=60_000) as resp:
        page.get_by_role("button", name="Guardar cambios").click()
    response = resp.value
    if response.status not in (200, 201):
        raise AssertionError(f"editar venta #{sale_id} devolvio {response.status}: {response.text()[:500]}")
    expect(page.get_by_text(f"Editar venta #{sale_id}")).to_have_count(0, timeout=20_000)
    page.get_by_role("button", name="Cerrar").click()
    return f"venta #{sale_id} editada a {method} con precio {price}"


def edit_cash_sale_from_cash_history(page: Page):
    if ctx.cash_sale_id is None:
        raise AssertionError("no hay venta efectivo creada")
    open_sales_history_from_cash(page)
    detail = edit_sale_in_open_history(
        page,
        ctx.cash_sale_id,
        99000,
        "Tarjeta",
        "QA correccion venta efectivo desde Caja",
    )
    ctx.edited_cash_sale_id = ctx.cash_sale_id
    return detail


def fetch_sale(page: Page, sale_id: int) -> dict:
    api_response = page.request.get(f"{BASE_URL}/api/proxy/orders/manual/list")
    if api_response.status != 200:
        raise AssertionError(f"no pude leer ventas por API: {api_response.status}")
    orders = api_response.json()
    sale = next((order for order in orders if order.get("id") == sale_id), None)
    if not sale:
        raise AssertionError(f"venta #{sale_id} no aparece por API")
    return sale


def verify_card_sale_has_no_discount(page: Page):
    if ctx.cash_sale_id is None:
        raise AssertionError("no hay venta efectivo creada")
    sale = fetch_sale(page, ctx.cash_sale_id)
    discount = round(float(sale.get("discountAmount") or 0), 2)
    subtotal = round(float(sale.get("subtotal") or 0), 2)
    total = round(float(sale.get("total") or 0), 2)
    method = (sale.get("payments") or [{}])[0].get("method")
    ctx.card_discount_after_edit = discount
    if method != "Tarjeta" or discount != 0 or total != subtotal:
        raise AssertionError(
            f"venta #{ctx.cash_sale_id} no quedo sin descuento al pasar a Tarjeta: "
            f"metodo={method}, subtotal={subtotal}, descuento={discount}, total={total}"
        )
    return f"venta #{ctx.cash_sale_id} Tarjeta sin descuento"


def edit_card_sale_back_to_cash(page: Page):
    if ctx.cash_sale_id is None:
        raise AssertionError("no hay venta efectivo creada")
    open_sales_history_from_cash(page)
    detail = edit_sale_in_open_history(
        page,
        ctx.cash_sale_id,
        99000,
        "Efectivo",
        "QA correccion tarjeta a efectivo aplica descuento",
    )
    sale = fetch_sale(page, ctx.cash_sale_id)
    discount = round(float(sale.get("discountAmount") or 0), 2)
    subtotal = round(float(sale.get("subtotal") or 0), 2)
    total = round(float(sale.get("total") or 0), 2)
    method = (sale.get("payments") or [{}])[0].get("method")
    ctx.cash_discount_after_reedit = discount
    if method != "Efectivo" or discount <= 0 or total >= subtotal:
      raise AssertionError(
          f"venta #{ctx.cash_sale_id} no aplico descuento al pasar a Efectivo: "
          f"metodo={method}, subtotal={subtotal}, descuento={discount}, total={total}"
      )
    return f"{detail}; descuento aplicado {discount}"


def edit_cash_sale_to_transfer_with_discount(page: Page):
    if ctx.cash_sale_id is None:
        raise AssertionError("no hay venta efectivo creada")
    open_sales_history_from_cash(page)
    detail = edit_sale_in_open_history(
        page,
        ctx.cash_sale_id,
        99000,
        "Transferencia",
        "QA correccion efectivo a transferencia conserva descuento",
    )
    sale = fetch_sale(page, ctx.cash_sale_id)
    discount = round(float(sale.get("discountAmount") or 0), 2)
    subtotal = round(float(sale.get("subtotal") or 0), 2)
    total = round(float(sale.get("total") or 0), 2)
    method = (sale.get("payments") or [{}])[0].get("method")
    if method != "Transferencia" or discount <= 0 or total >= subtotal:
      raise AssertionError(
          f"venta #{ctx.cash_sale_id} no aplico descuento al pasar a Transferencia: "
          f"metodo={method}, subtotal={subtotal}, descuento={discount}, total={total}"
      )
    return f"{detail}; descuento transferencia {discount}"


def edit_account_sale_from_dashboard_history(page: Page):
    if ctx.account_sale_id is None:
        raise AssertionError("no hay venta cuenta corriente creada")
    open_sales_history_from_dashboard(page)
    detail = edit_sale_in_open_history(
        page,
        ctx.account_sale_id,
        88000,
        "Cuenta corriente",
        "QA correccion venta cuenta corriente desde Inicio",
    )
    ctx.edited_account_sale_id = ctx.account_sale_id
    return detail


def open_current_account_detail(page: Page):
    open_top_tab(page, "Cuentas corrientes")
    page.get_by_role("button", name="Abrir ficha").first.click()
    expect(page.get_by_text("CUENTA CORRIENTE")).to_be_visible(timeout=20_000)


def register_current_account_payment(page: Page, amount: int, note: str):
    page.get_by_role("button", name="Registrar pago").last.click(force=True)
    expect(page.get_by_text("Monto entregado")).to_be_visible(timeout=15_000)
    fill_last_visible_text_input(page, str(amount))
    page.locator("select").last.select_option("Tarjeta")
    page.locator('textarea[placeholder="Ej: Entrega parcial en mostrador"]').fill(note)
    with page.expect_response(lambda r: "/api/proxy/current-accounts/customers/" in r.url and "/payments" in r.url and r.request.method == "POST", timeout=60_000) as resp:
        page.get_by_role("button", name="Registrar pago en ficha").click()
    response = resp.value
    if response.status not in (200, 201):
        raise AssertionError(f"registrar pago devolvio {response.status}: {response.text()[:500]}")
    page.wait_for_timeout(1_500)
    expect(page.get_by_text("Historial")).to_be_visible(timeout=20_000)
    return response.status


def edit_current_account_payment(page: Page):
    open_current_account_detail(page)
    register_current_account_payment(page, 1234, "QA pago para editar")
    page.get_by_label("Editar pago").first.click()
    expect(page.get_by_text("CORREGIR PAGO")).to_be_visible(timeout=15_000)
    fill_last_visible_text_input(page, "1235")
    page.locator("select").last.select_option("Transferencia")
    textareas = page.locator("textarea")
    textareas.nth(textareas.count() - 2).fill("QA pago editado")
    textareas.nth(textareas.count() - 1).fill("QA correccion de pago desde historial")
    with page.expect_response(lambda r: "/api/proxy/current-accounts/payments/" in r.url and r.request.method == "PATCH", timeout=60_000) as resp:
        page.get_by_role("button", name="Guardar correccion").click()
    response = resp.value
    ctx.payment_update_status = response.status
    if response.status not in (200, 201):
        raise AssertionError(f"editar pago devolvio {response.status}: {response.text()[:500]}")
    expect(page.get_by_text("CORREGIR PAGO")).to_have_count(0, timeout=20_000)
    return "pago registrado y corregido desde historial"


def cancel_current_account_payment(page: Page):
    open_current_account_detail(page)
    register_current_account_payment(page, 500, "QA pago para anular")
    page.get_by_label("Anular pago").first.click()
    expect(page.get_by_text("Anular pago")).to_be_visible(timeout=15_000)
    page.locator('textarea[placeholder="Ej: el pago correspondia a otro cliente"]').fill("QA anulacion de pago desde historial")
    with page.expect_response(lambda r: "/api/proxy/current-accounts/payments/" in r.url and "/cancel" in r.url and r.request.method == "POST", timeout=60_000) as resp:
        page.get_by_role("button", name=re.compile("Anular pago|Confirmar anulacion")).last.click()
    response = resp.value
    ctx.payment_cancel_status = response.status
    if response.status not in (200, 201):
        raise AssertionError(f"anular pago devolvio {response.status}: {response.text()[:500]}")
    page.wait_for_timeout(1_500)
    return "pago registrado y anulado desde historial"


def final_backend_assertions(page: Page):
    ids = [ctx.cash_sale_id, ctx.account_sale_id]
    missing = [value for value in ids if value is None]
    if missing:
        raise AssertionError("faltan IDs de ventas")
    cash_sale = fetch_sale(page, ctx.cash_sale_id)
    cash_discount = round(float(cash_sale.get("discountAmount") or 0), 2)
    cash_subtotal = round(float(cash_sale.get("subtotal") or 0), 2)
    cash_total = round(float(cash_sale.get("total") or 0), 2)
    cash_method = (cash_sale.get("payments") or [{}])[0].get("method")
    if cash_method not in ("Efectivo", "Transferencia") or cash_discount <= 0 or cash_total >= cash_subtotal:
        raise AssertionError(
            f"venta #{ctx.cash_sale_id} no recalculo descuento para metodo con descuento: "
            f"metodo={cash_method}, subtotal={cash_subtotal}, descuento={cash_discount}, total={cash_total}"
        )
    open_sales_history_from_cash(page)
    body = page.locator("body").inner_text(timeout=10_000)
    for sale_id in ids:
        if f"#{sale_id}" not in body:
            raise AssertionError(f"venta #{sale_id} no aparece en historial final")
    page.get_by_role("button", name="Cerrar").click()
    return f"ventas visibles: #{ctx.cash_sale_id}, #{ctx.account_sale_id}; descuento efectivo {cash_discount}; pagos PATCH {ctx.payment_update_status}, cancel {ctx.payment_cancel_status}"


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1200})
        page.set_default_timeout(30_000)
        run_step("Login admin store 7", lambda: login(page))
        run_step("Abrir workspace venta manual", lambda: open_manual_workspace(page))
        run_step("Crear venta manual efectivo", lambda: create_cash_sale(page))
        run_step("Crear venta a cuenta corriente", lambda: create_current_account_sale(page))
        run_step("Editar venta desde Caja > Historial de ventas", lambda: edit_cash_sale_from_cash_history(page))
        run_step("Verificar Tarjeta sin descuento", lambda: verify_card_sale_has_no_discount(page))
        run_step("Editar venta Tarjeta > Efectivo con descuento", lambda: edit_card_sale_back_to_cash(page))
        run_step("Editar venta Efectivo > Transferencia con descuento", lambda: edit_cash_sale_to_transfer_with_discount(page))
        run_step("Editar venta desde Inicio > Historial de ventas", lambda: edit_account_sale_from_dashboard_history(page))
        run_step("Registrar y editar pago en historial de cuenta corriente", lambda: edit_current_account_payment(page))
        run_step("Registrar y anular pago en historial de cuenta corriente", lambda: cancel_current_account_payment(page))
        run_step("Verificacion final de historiales", lambda: final_backend_assertions(page))
        page.screenshot(path="output/qa_manual_sales_accounts_final.png", full_page=True)
        browser.close()

    summary = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "context": ctx.__dict__,
        "results": [result.__dict__ for result in results],
    }
    with open("output/qa_manual_sales_accounts_result.json", "w", encoding="utf-8") as fh:
        json.dump(summary, fh, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
