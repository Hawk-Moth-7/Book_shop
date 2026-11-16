
"use strict";

// Практическая работа № 2. «Читающие мотыльки».
// Формы проверяются в браузере: данные не отправляются на сервер.

document.addEventListener("DOMContentLoaded", () => {
    initFeedback();
    initCatalog();
    initCart();
    initMap();
});

function errorElement(field) {
    const ids = (field.getAttribute("aria-describedby") || "").split(/\s+/);
    return ids.map(id => document.getElementById(id)).find(Boolean) || null;
}

function showError(field, message) {
    const element = errorElement(field);
    if (element) element.textContent = message;
    field.setAttribute("aria-invalid", message ? "true" : "false");
}

function fieldError(field) {
    const value = field.value.trim();

    if (field.required && !value) {
        return "Заполните это поле.";
    }

    if (field.name === "name" && value.length < 2) {
        return "Введите не менее двух символов.";
    }

    if (field.name === "email" &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        return "Введите корректный адрес электронной почты.";
    }

    if (field.name === "message" && value.length < 10) {
        return "Напишите сообщение длиной не менее 10 символов.";
    }

    if (field.name === "author" && value && value.length < 2) {
        return "Введите не менее двух символов.";
    }

    if (field.name === "maxPrice" && value) {
        const price = Number(value);

        if (field.validity.badInput ||
            !Number.isInteger(price) ||
            price < 1 ||
            price > 100000) {
            return "Укажите целую цену от 1 до 100000 ₽.";
        }
    }

    return "";
}

function validateField(field) {
    const message = fieldError(field);
    showError(field, message);
    return !message;
}

function setupValidation(form) {
    const fields = [
        ...form.querySelectorAll("input[name], textarea[name]")
    ];

    fields.forEach(field => {
        field.addEventListener("blur", () => validateField(field));

        field.addEventListener("input", () => {
            if (field.getAttribute("aria-invalid") === "true") {
                validateField(field);
            }
        });
    });

    return {
        check() {
            const invalid = fields.filter(
                field => !validateField(field)
            );

            if (invalid.length) invalid[0].focus();

            return invalid.length === 0;
        },

        clear() {
            fields.forEach(field => showError(field, ""));
        }
    };
}

// 1. Форма обратной связи

function initFeedback() {
    const form = document.getElementById("feedback-form");
    if (!form) return;

    const result = document.getElementById("form-result");
    const validation = setupValidation(form);

    form.addEventListener("submit", event => {
        event.preventDefault();

        if (result) result.hidden = true;
        if (!validation.check()) return;

        const name = form.elements.namedItem("name").value.trim();

        if (result) {
            result.textContent =
                `Спасибо, ${name}! Проверка пройдена. ` +
                "Сообщение пока не отправляется на сервер.";
            result.hidden = false;
        }

        form.reset();
        validation.clear();
    });
}

// 2. Фильтрация и сортировка каталога

function initCatalog() {
    const form = document.getElementById("filters");
    const list = document.getElementById("book-list");

    if (!form || !list) return;

    const validation = setupValidation(form);
    const books = [...list.querySelectorAll(":scope > li")];
    const count = document.getElementById("catalog-count");
    const empty = document.getElementById("catalog-empty");

    const get = name => form.elements.namedItem(name).value;

    function update() {
        const genre = get("genre");
        const author = get("author").trim().toLocaleLowerCase("ru");
        const priceText = get("maxPrice").trim();
        const maxPrice = priceText ? Number(priceText) : Infinity;

        let visible = 0;

        books.forEach(book => {
            const match =
                (!genre || book.dataset.genre === genre) &&
                Number(book.dataset.price) <= maxPrice &&
                (book.dataset.author || "")
                    .toLocaleLowerCase("ru")
                    .includes(author);

            book.hidden = !match;

            if (match) visible++;
        });

        const sort = get("sort");

        const compare = {
            title: (a, b) =>
                (a.dataset.title || "").localeCompare(
                    b.dataset.title || "", "ru"
                ),

            "price-asc": (a, b) =>
                Number(a.dataset.price) - Number(b.dataset.price),

            "price-desc": (a, b) =>
                Number(b.dataset.price) - Number(a.dataset.price),

            year: (a, b) =>
                Number(a.dataset.year) - Number(b.dataset.year)
        };

        [...books]
            .sort(compare[sort] || compare.title)
            .forEach(book => list.append(book));

        if (count) {
            count.textContent =
                `Показано книг: ${visible} из ${books.length}`;
        }

        if (empty) empty.hidden = visible !== 0;
    }

    form.addEventListener("submit", event => {
        event.preventDefault();

        if (validation.check()) update();
    });

    form.elements.namedItem("sort").addEventListener(
        "change",
        () => {
            if (validation.check()) update();
        }
    );

    form.addEventListener("reset", () => {
        queueMicrotask(() => {
            validation.clear();
            update();
        });
    });

    update();
}

// 3. Корзина

function initCart() {
    const table = document.querySelector(
        "table.cart, .cart table"
    );

    if (!table) return;

    const totalElement = document.getElementById("total");
    const empty = document.getElementById("cart-empty");

    function recalculate() {
        let total = 0;

        const rows = [
            ...table.querySelectorAll("tbody tr[data-p]")
        ];

        rows.forEach(row => {
            const input = row.querySelector('input[type="number"]');
            const sum = row.querySelector(".sum");

            if (!input || !sum) return;

            const value = Number(input.value);

            const quantity =
                Number.isFinite(value) && value > 0
                    ? Math.min(99, Math.max(1, Math.trunc(value)))
                    : 1;

            input.value = String(quantity);

            const subtotal = Number(row.dataset.p) * quantity;

            sum.textContent = `${subtotal} ₽`;
            total += subtotal;
        });

        if (totalElement) {
            totalElement.textContent = `${total} ₽`;
        }

        if (empty) {
            empty.hidden = rows.length > 0;
        }
    }

    table.addEventListener("change", event => {
        if (event.target.matches('input[type="number"]')) {
            recalculate();
        }
    });

    table.addEventListener("click", event => {
        const button = event.target.closest("button.link");

        if (!button || !table.contains(button)) return;

        button.closest("tr")?.remove();
        recalculate();
    });

    recalculate();
}

// 4. Внешние данные: fetch + Яндекс Карты

// Nominatim возвращает JSON через fetch.
// Яндекс Карты отображают точку на интерактивной карте.

function initMap() {
    const frame = document.getElementById("map-frame");
    const status = document.getElementById("map-status");

    if (!frame || !status) return;

    frame.hidden = true;

    let controller = null;
    let requestNumber = 0;

    function setStatus(message) {
        status.textContent = message;
        status.hidden = !message;
    }

    function showRetry(message) {
        frame.hidden = true;
        setStatus(message);

        const retry = document.createElement("button");
        retry.type = "button";
        retry.className = "btn";
        retry.textContent = "Повторить загрузку";

        retry.addEventListener("click", load);
        status.append(" ", retry);
    }

    async function load() {
        const number = ++requestNumber;

        if (controller) controller.abort();

        controller = new AbortController();

        frame.hidden = true;

        setStatus(
            "Загружаем данные о местоположении магазина…"
        );

        if (!navigator.onLine) {
            showRetry(
                "Нет подключения к интернету. " +
                "Контактные данные доступны выше."
            );
            return;
        }

        const timer = setTimeout(
            () => controller.abort(),
            12000
        );

        try {
            const url = new URL(
                "https://nominatim.openstreetmap.org/reverse"
            );

            url.searchParams.set("lat", "59.835862");
            url.searchParams.set("lon", "30.129279");
            url.searchParams.set("zoom", "18");
            url.searchParams.set("format", "json");

            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    Accept: "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const place = await response.json();

            if (!place || place.error) {
                throw new Error("Адрес не найден");
            }

            const lat = Number(place.lat);
            const lon = Number(place.lon);

            if (!Number.isFinite(lat) ||
                !Number.isFinite(lon)) {
                throw new Error("Некорректные координаты");
            }

            if (number !== requestNumber) return;

            const mapUrl = new URL(
                "https://yandex.ru/map-widget/v1/"
            );

            mapUrl.searchParams.set(
                "ll",
                `${lon},${lat}`
            );

            mapUrl.searchParams.set("z", "17");

            mapUrl.searchParams.set(
                "pt",
                `${lon},${lat},pm2rdm`
            );

            frame.src = mapUrl.toString();
            frame.hidden = false;

            setStatus(
                "Координаты получены. " +
                "Загружается Яндекс Карта…"
            );

            frame.onload = () => {
                if (number === requestNumber) {
                    setStatus("");
                }
            };

            // Ссылка на полную карту остаётся доступна
            // и без JavaScript.

        } catch (error) {
            if (number !== requestNumber) return;

            console.error(
                "Не удалось загрузить геоданные:",
                error
            );

            showRetry(
                error.name === "AbortError"
                    ? "Время ожидания истекло. Попробуйте ещё раз."
                    : "Не удалось получить данные карты. " +
                    "Проверьте соединение и повторите попытку."
            );

        } finally {
            clearTimeout(timer);
        }
    }

    window.addEventListener("offline", () => {
        ++requestNumber;

        if (controller) controller.abort();

        showRetry(
            "Интернет отключён. Карта недоступна, " +
            "но контакты магазина сохранены на странице."
        );
    });

    load();
}
