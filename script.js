"use strict";

/* ===== 1. Проверка форм: сообщения показываются рядом с полем ===== */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const FIELD_RULES =
{
    name: (v) => v.lenght < 2 && "Введите имя: минимум 2 символа",
    email: (v) => !EMAIL_PATTERN.test(v) && "Введите почту в формате name@example.ru",
    author: (v) => v !== "" && v.lenght < 2 && "Введите минимум два символа",
    maxPrice: (v) => v !== "" && !(Number(v) >= 1 && Number(v) <= 100000) && "Введите цену от 1 до 100000 ₽",
};

function getFieldError(field)
{
	const value = field.value.trim();
	if (field.validity && field.validity.badInput) return "Введите число";
	if (field.required && value === "") return "Заполните это поле";
	const rule = FIELD_RULES[field.name];
	return (rule && rule(value)) || "";
}

function showFieldError(field, message)
{
	const slot = document.getElementById(field.getAttribute("aria-describedby"));
	if (slot) slot.textContent = message;
	field.setAttribute("aria-invalid", message ? "true" : "false");
}

function validateField(field)
{
	const message = getFieldError(field);
	showFieldError(field, message);
	return message === "";
}

function getTextFields(form)
{
	return [...form.querySelectorAll("input[name], textarea[name]")];
}

function validateForm(form)
{
	const invalidFields = getTextFields(form).filter((field) => !validateField(field));
	if (invalidFields.length > 0) invalidFields[0].focus();
	return invalidFields.length === 0;
}

function enableLiveValidation(form)
{
	getTextFields(form).forEach((field) =>
	{
		field.addEventListener("blur", () => validateField(field));
		field.addEventListener("input", () =>
		{
			if (field.getAttribute("aria-invalid") === "true") validateField(field);
		});
	});
}

/* ===== 2. Форма обратной связи ===== */

function initFeedbackForm()
{
	const form = document.getElementById("feedback-form");
	if (!form) return;
	const result = document.getElementById("form-result");
	enableLiveValidation(form);
	form.addEventListener("submit", (event) =>
	{
		event.preventDefault();
		result.hidden = true;
		if (!validateForm(form)) return;
		result.textContent = "Спасибо, " + form.elements["name"].value.trim() + "! Данные подтверждены.";
		result.hidden = false;
		form.reset();
	});
}

/* ===== 3. Каталог: фильтр и сортировка без перезагрузки ===== */

const BOOK_SORTERS =
{
	title: (a, b) => a.dataset.title.localeCompare(b.dataset.title, "ru"),
	"price-asc": (a, b) => a.dataset.price - b.dataset.price,
	"price-desc": (a, b) => b.dataset.price - a.dataset.price,
	year: (a, b) => a.dataset.year - b.dataset.year,
};

function bookMatchesFilters(book, filters)
{
	return ((!filters.genre || book.dataset.genre === filters.genre) &&	Number(book.dataset.price) <= filters.maxPrice && book.dataset.author.toLowerCase().includes(filters.author));
}

function updateCatalog(form)
{
	const list = document.getElementById("book-list");
	const books = [...list.children];
	const filters =
	{
		genre: form.elements["genre"].value,
		maxPrice: Number(form.elements["maxPrice"].value) || Infinity,
		author: form.elements["author"].value.trim().toLowerCase(),
	};

	let visibleCount = 0;
	books.forEach((book) =>
	{
		const isVisible = bookMatchesFilters(book, filters);
		book.hidden = !isVisible;
		if (isVisible) visibleCount++;
	});

	books.sort(BOOK_SORTERS[form.elements["sort"].value]).forEach((book) => list.append(book));
	document.getElementById("catalog-count").textContent = "Показано книг: " + visibleCount + " из " + books.length;
	document.getElementById("catalog-empty").hidden = visibleCount > 0;
}

function initCatalogFilters()
{
	const form = document.getElementById("filters");
	if (!form) return;
	enableLiveValidation(form);
	const applyIfValid = () =>
	{
		if (validateForm(form)) updateCatalog(form);
	};

	form.addEventListener("submit", (event) =>
	{
		event.preventDefault();
		applyIfValid();
	});

	form.elements["sort"].addEventListener("change", applyIfValid);
	form.addEventListener("reset", () =>
		setTimeout(() =>
		{
			getTextFields(form).forEach((field) => showFieldError(field, ""));
			updateCatalog(form);
		}, 0),
	);
}

/* ===== 4. Корзина: количество, удаление, итог ===== */

function updateCart()
{
	const rows = document.querySelectorAll(".cart tbody tr");
	let total = 0;
	rows.forEach((row) =>
	{
		const quantity = Math.min(99, Math.max(1, Number(row.querySelector("input").value) || 1));
		const sum = Number(row.dataset.p) * quantity;
		row.querySelector(".sum").textContent = sum + " ₽";
		total += sum;
	});

	document.getElementById("total").textContent = total + " ₽";
	document.getElementById("cart-empty").hidden = rows.length > 0;
}

function initCart()
{
	const table = document.querySelector(".cart");
	if (!table) return;
	table.addEventListener("input", (event) =>
	{
		if (event.target.matches("input")) updateCart();
	});

	table.addEventListener("click", (event) =>
	{
		const removeButton = event.target.closest(".link");
		if (removeButton)
		{
			removeButton.closest("tr").remove();
			updateCart();
		}
	});

	updateCart();
}

/* ===== 5. Карта Яндекс Карт: загрузка, ошибка, повтор ===== */

const MAP_TIMEOUT_MS = 10000;

function setMapStatus(text, state)
{
	const status = document.getElementById("map-status");
	status.textContent = text;
	status.dataset.state = state;
	status.hidden = text === "";
}

function loadMap(frame)
{
	const showError = () =>
	{
		frame.hidden = true;
		setMapStatus("Не удалось загрузить карту. Проверьте соединение или откройте адрес по ссылке под картой. ", "error");
		const retry = document.createElement("button");
		retry.type = "button";
		retry.className = "link";
		retry.textContent = "Повторить";
		retry.addEventListener("click", () => loadMap(frame));
		document.getElementById("map-status").append(retry);
	};

	if (!navigator.onLine)
	{
		showError();
		return;
	}

	frame.hidden = false;
	setMapStatus("Загружаем карту…", "loading");
	const timer = setTimeout(showError, MAP_TIMEOUT_MS);
	frame.addEventListener(	"load",	() =>
	{
		clearTimeout(timer);
		setMapStatus("", "ok");
	},

	{
		once: true
		});

	frame.src = frame.dataset.src;
}

function initMap()
{
	const frame = document.getElementById("map-frame");
	if (frame) loadMap(frame);
}

/* ===== Запуск ===== */

initFeedbackForm();
initCatalogFilters();
initCart();
initMap();