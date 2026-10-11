
/* ==================================
   1. SUPERMARKET PRODUCT PRICES
================================== */

// Example prices in Nigerian naira.
// Replace with actual supermarket prices later.

const prices = {
    "local-rice": 5000,
    "foreign-rice": 6500,
    "ofada-rice": 7000,
    "basmati-rice": 8500,
    "white-beans": 3500,
    "honey-beans": 4000,
    "white-garri": 1800,
    "yellow-garri": 2000,
    "ijebu-garri": 2500,
    "semovita": 4500,
    "semolina": 4000,
    "poundo-yam": 5500,
    "yam": 3000,
    "irish-potato": 2000,
    "sweet-potato": 1800,
    "palm-oil": 3500,
    "vegetable-oil": 4000,
    "groundnut-oil": 4500,
    "salt": 500,
    "sugar": 1800,
    "maggi": 1200,
    "knorr": 1300,
    "curry": 800,
    "thyme": 800,
    "egusi": 4000,
    "ogbono": 5000,
    "crayfish": 3500,
    "tomato-paste": 1200,
    "indomie": 450,
    "spaghetti": 1500,
    "macaroni": 1400,
    "sardines": 1800,
    "corned-beef": 3500,
    "baked-beans": 1600,
    "cornflakes": 3500,
    "golden-morn": 2800,
    "custard": 2500,
    "peak-milk": 1500,
    "dano-milk": 2000,
    "cowbell": 1200,
    "yoghurt": 1800,
    "butter": 2500,
    "eggs": 500,
    "agege-bread": 1800,
    "sliced-bread": 2200,
    "meat-pie": 1200,
    "chin-chin": 1000,
    "plantain-chips": 800,
    "popcorn": 700,
    "chocolate": 1500,
    "chicken": 8500,
    "turkey": 10000,
    "beef": 6500,
    "goat-meat": 7500,
    "titus-fish": 4500,
    "catfish": 5000,
    "stockfish": 6500,
    "frozen-chicken": 9000,
    "frozen-fish": 5000,
    "ugu": 500,
    "okra": 700,
    "cabbage": 1500,
    "carrot": 1000,
    "cucumber": 800,
    "onions": 1500,
    "apple": 800,
    "orange": 500,
    "banana": 700,
    "pineapple": 1800,
    "watermelon": 3500,
    "mango": 800,
    "bottled-water": 300,
    "sachet-water": 400,
    "coca-cola": 600,
    "pepsi": 600,
    "fanta": 600,
    "sprite": 600,
    "maltina": 900,
    "five-alive": 2500,
    "chi-exotic": 2800,
    "milo": 3000,
    "bournvita": 3200,
    "nescafe": 3500,
    "lipton": 1800,
    "honey": 3500,
    "jam": 2200,
    "peanut-butter": 3000,
    "cerelac": 6500,
    "infant-formula": 12000,
    "bathing-soap": 800,
    "toothpaste": 1500,
    "toothbrush": 700,
    "shampoo": 3500,
    "body-cream": 4500,
    "deodorant": 2500,
    "diapers": 8000,
    "baby-wipes": 2500,
    "detergent": 3000,
    "washing-soap": 1200,
    "dishwashing-liquid": 1800,
    "bleach": 1500,
    "toilet-paper": 2500,
    "facial-tissue": 1200
};


/* ==================================
   2. GET HTML ELEMENTS
================================== */

const productSelect =
    document.getElementById("product");

const quantityInput =
    document.getElementById("quantity");

const addToCartButton =
    document.getElementById("add-to-cart");

const cartItems =
    document.getElementById("cart-items");

const grandTotal =
    document.getElementById("grand-total");

const clearCartButton =
    document.getElementById("clear-cart");

const confirmCartButton =
    document.getElementById("confirm-cart");


/* ==================================
   3. CREATE EMPTY CART
================================== */

let cart = [];

const money = (amount) =>
    "₦" + amount.toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });



/* ADD PRODUCT FROM INVENTORY */

addToCartButton.addEventListener("click", function () {

    const productId = productSelect.value;

    const quantity = Number(quantityInput.value);

    const product = inventory.find(
        p => p.id === productId
    );

    if (!product) {
        alert("Please select a product.");
        return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
        alert("Enter a valid quantity.");
        return;
    }

    const existing = cart.find(
        item => item.id === productId
    );

    const alreadyInCart = existing
        ? existing.quantity : 0;

    if (quantity + alreadyInCart > product.stock) {
        alert("Not enough stock available.");
        return;
    }

    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: quantity
        });
    }

    displayCart();

});


/* ==================================
   5. DISPLAY SHOPPING CART
================================== */

function displayCart() { 

    purchaseConfirmed = false;
    document.getElementById("receipt").hidden = true;

    cartItems.innerHTML = "";

    let total = 0;

    cart.forEach(function (item, index) {

        const itemTotal =
            item.price * item.quantity;

        total += itemTotal;

        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.textContent = item.name;

        const quantityCell = document.createElement("td");
        quantityCell.textContent = item.quantity;

        const priceCell = document.createElement("td");
        priceCell.textContent = money(item.price);

        const totalCell = document.createElement("td");
        totalCell.textContent = money(itemTotal);

        const actionCell = document.createElement("td");

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.textContent = "Remove";

        removeButton.addEventListener("click", function () {
            removeProduct(index);
        });

        actionCell.appendChild(removeButton);

        row.append(
            nameCell,
            quantityCell,
            priceCell,
            totalCell,
            actionCell
        );

        cartItems.appendChild(row);

    });

    grandTotal.textContent = money(total);
}


/* ==================================
   6. REMOVE A PRODUCT
================================== */

function removeProduct(index) {

    cart.splice(index, 1);

    displayCart();

}


/* ==================================
   7. CLEAR THE ENTIRE CART
================================== */

clearCartButton.addEventListener("click", function () {

    if (cart.length === 0) {
        alert("Your cart is already empty.");
        return;
    }

    const answer = confirm(
        "Are you sure you want to clear the cart?"
    );

    if (answer) {
        cart = [];
        displayCart();
    }

});


/* ==================================
   8. CONFIRM PURCHASE
================================== */

let purchaseConfirmed = false;

confirmCartButton.addEventListener("click", function () {

    if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
    }

    const customerName = document
        .getElementById("customer-name")
        .value.trim();

    const customerEmail = document
        .getElementById("customer-email")
        .value.trim();

    const paymentMethod = document
        .getElementById("payment-method")
        .value;

    if (customerName === "") {
        alert("Enter the customer's name.");
        return;
    }

    if (customerEmail !== "" &&
        !document.getElementById("customer-email")
            .checkValidity()) {
        alert("Enter a valid customer email.");
        return;
    }

    if (paymentMethod === "") {
        alert("Select a payment method.");
        return;
    }

    const confirmed = confirm(
        "Has payment been received? Confirm purchase?"
    );

    if (!confirmed) {
        return;
    }

    purchaseConfirmed = true;

    generateReceipt();

});


/* ==================================
   9. GENERATE RECEIPT
================================== */

function generateReceipt() {

    if (!completeInventorySale(receiptId)) {
    purchaseConfirmed = false;
    document.getElementById("receipt").hidden = true;
    return;
}

saveSale(receiptId, date, total);

    if (!purchaseConfirmed || cart.length === 0) {
        return;
    }

    const receiptSection =
        document.getElementById("receipt");

    const receiptItems =
        document.getElementById("receipt-items");

    const receiptTotal =
        document.getElementById("receipt-total");

    const receiptNumber =
        document.getElementById("receipt-number");

    const receiptDate =
        document.getElementById("receipt-date");

    const receiptCustomer =
        document.getElementById("receipt-customer");

    const receiptEmail =
        document.getElementById("receipt-customer-email");

    const receiptPayment =
        document.getElementById("receipt-payment");

    // Generate a unique ID for this receipt
    const receiptId = "SM-" + crypto.randomUUID();

    // Current date and time
    const date = new Date();

    receiptNumber.textContent = receiptId;

    receiptDate.textContent =
        date.toLocaleString("en-NG");

    receiptCustomer.textContent =
        document.getElementById("customer-name").value;

    receiptEmail.textContent =
        document.getElementById("customer-email").value
        || "Not provided";

    const paymentSelect =
        document.getElementById("payment-method");

    receiptPayment.textContent =
        paymentSelect.options[
            paymentSelect.selectedIndex
        ].text;

    // Empty previous receipt rows
    receiptItems.innerHTML = "";

    let total = 0;

    cart.forEach(function (item) {

        const itemTotal =
            item.price * item.quantity;

        total += itemTotal;

        const row = document.createElement("tr");

        const values = [
            item.name,
            item.quantity,
            money(item.price),
            money(itemTotal)
        ];

        values.forEach(function (value) {

            const cell = document.createElement("td");

            cell.textContent = value;

            row.appendChild(cell);

        });

        receiptItems.appendChild(row);

    });

    receiptTotal.textContent = money(total);

    // Display the receipt
    receiptSection.hidden = false;

    // Scroll to receipt
    receiptSection.scrollIntoView({
        behavior: "smooth"
    });

}


/* ==================================
   10. PRINT RECEIPT
================================== */

document.getElementById("print-receipt")
    .addEventListener("click", function () {

        window.print();

    });

/* ==================================
   11. CREATE RECEIPT MESSAGE
================================== */

function createReceiptMessage() {

    if (!purchaseConfirmed || cart.length === 0) {
        alert("Confirm a purchase first.");
        return null;
    }

    const storeName = "SUPERMARKET NAME";

    const receiptNumber = document
        .getElementById("receipt-number")
        .textContent;

    const receiptDate = document
        .getElementById("receipt-date")
        .textContent;

    const customerName = document
        .getElementById("receipt-customer")
        .textContent;

    const paymentMethod = document
        .getElementById("receipt-payment")
        .textContent;

    let message = `${storeName}
PURCHASE RECEIPT

Receipt Number: ${receiptNumber}
Date: ${receiptDate}
Customer: ${customerName}

PURCHASED PRODUCTS
--------------------------
`;

    let total = 0;

    cart.forEach(function (item) {

        const itemTotal = item.price * item.quantity;

        total += itemTotal;

        message += `
${item.name}
Quantity: ${item.quantity}
Unit Price: ${money(item.price)}
Subtotal: ${money(itemTotal)}
`;

    });

    message += `
--------------------------
GRAND TOTAL: ${money(total)}
Payment Method: ${paymentMethod}

Thank you for shopping with us!
`;

    return message;
}


/* ==================================
   12. SEND RECEIPT VIA EMAIL
================================== */

document.getElementById("email-receipt")
    .addEventListener("click", function () {

        const message = createReceiptMessage();

        if (!message) return;

        const email = document
            .getElementById("customer-email")
            .value.trim();

        const emailField = document
            .getElementById("customer-email");

        if (!email || !emailField.checkValidity()) {
            alert("Enter a valid customer email.");
            return;
        }

        const receiptNumber = document
            .getElementById("receipt-number")
            .textContent;

        const subject = encodeURIComponent(
            "Your Supermarket Receipt - " + receiptNumber
        );

        const body = encodeURIComponent(message);

        const emailLink =
            `mailto:${email}?subject=${subject}&body=${body}`;

        window.location.href = emailLink;

    });


/* ==================================
   13. SEND RECEIPT VIA WHATSAPP
================================== */

document.getElementById("whatsapp-receipt")
    .addEventListener("click", function () {

        const message = createReceiptMessage();

        if (!message) return;

        const phone = document
            .getElementById("customer-phone")
            .value.trim();

        // Remove spaces, hyphens and brackets
        let cleanedPhone = phone.replace(/[^\d+]/g, "");

        // Convert Nigerian local numbers
        if (/^0\d{10}$/.test(cleanedPhone)) {
            cleanedPhone = "234" + cleanedPhone.slice(1);
        } else if (cleanedPhone.startsWith("+")) {
            cleanedPhone = cleanedPhone.slice(1);
        }

        if (!/^\d{8,15}$/.test(cleanedPhone)) {
            alert(
                "Enter a valid international WhatsApp number."
            );
            return;
        }

        const whatsappLink =
            "https://wa.me/" +
            cleanedPhone +
            "?text=" +
            encodeURIComponent(message);

        window.open(
            whatsappLink,
            "_blank",
            "noopener,noreferrer"
        );

    });

/* ==================================
   14. SAVE SALES HISTORY
================================== */

const SALES_KEY = "supermarketSales";

function getSales() {

    const saved = localStorage.getItem(SALES_KEY);

    try {
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error("Unable to read sales:", error);
        return [];
    }

}

function saveSale(receiptId, date, total) {

    const sales = getSales();

    // Prevent saving the same receipt twice.
    if (sales.some(sale => sale.id === receiptId)) {
        return;
    }

    const customerName = document
        .getElementById("customer-name")
        .value.trim();

    const paymentSelect = document
        .getElementById("payment-method");

    const paymentMethod =
        paymentSelect.options[
            paymentSelect.selectedIndex
        ].text;

    const sale = {
        id: receiptId,
        date: date.toISOString(),
        customer: customerName,
        items: cart.map(item => ({ ...item })),
        total: total,
        payment: paymentMethod
    };

    sales.push(sale);

    try {
        localStorage.setItem(
            SALES_KEY,
            JSON.stringify(sales)
        );
    } catch (error) {
        console.error("Unable to save sale:", error);
        alert("Sale could not be saved on this device.");
        return;
    }

    displaySales();

}


/* ==================================
   15. DISPLAY SALES HISTORY
================================== */

function displaySales(search = "") {

    const sales = getSales();

    const table = document
        .getElementById("sales-records");

    table.innerHTML = "";

    const filteredSales = sales.filter(sale => {

        const query = search.toLowerCase();

        return (
            sale.id.toLowerCase().includes(query) ||
            sale.customer.toLowerCase().includes(query)
        );

    });

    filteredSales.slice().reverse().forEach(sale => {

        const row = document.createElement("tr");

        const values = [
            sale.id,
            new Date(sale.date).toLocaleString("en-NG"),
            sale.customer,
            sale.items.reduce(
                (sum, item) => sum + item.quantity, 0
            ),
            money(sale.total),
            sale.payment
        ];

        values.forEach(value => {

            const cell = document.createElement("td");

            cell.textContent = value;

            row.appendChild(cell);

        });

        table.appendChild(row);

    });

    updateSalesDashboard(sales);

}


/* ==================================
   16. CALCULATE SALES STATISTICS
================================== */

function updateSalesDashboard(sales) {

    const today = new Date().toDateString();

    const todaySales = sales.filter(sale => {
        return new Date(sale.date).toDateString()
            === today;
    });

    const todayRevenue = todaySales.reduce(
        (sum, sale) => sum + sale.total, 0
    );

    const allTimeRevenue = sales.reduce(
        (sum, sale) => sum + sale.total, 0
    );

    document.getElementById("total-sales")
        .textContent = sales.length;

    document.getElementById("today-revenue")
        .textContent = money(todayRevenue);

    document.getElementById("all-time-revenue")
        .textContent = money(allTimeRevenue);

}


/* ==================================
   17. SEARCH SALES HISTORY
================================== */

document.getElementById("search-receipt")
    .addEventListener("input", function () {

        displaySales(this.value.trim());

    });


/* ==================================
   18. LOAD SAVED SALES
================================== */

displaySales();

/* ==================================
   19. INVENTORY MANAGEMENT
================================== */

const INVENTORY_KEY = "supermarketInventory";

function getInventory() {
    try {
        return JSON.parse(
            localStorage.getItem(INVENTORY_KEY)
        ) || [];
    } catch {
        return [];
    }
}

let inventory = getInventory();

function saveInventory() {
    localStorage.setItem(
        INVENTORY_KEY,
        JSON.stringify(inventory)
    );
}


/* ==================================
   20. ADD NEW PRODUCT
================================== */

document.getElementById("inventory-form")
    .addEventListener("submit", function (event) {

        event.preventDefault();

        const name = document
            .getElementById("new-product-name")
            .value.trim();

        const price = Number(document
            .getElementById("new-product-price").value);

        const stock = Number(document
            .getElementById("new-product-stock").value);

        if (!name || !Number.isFinite(price) ||
            price <= 0 || !Number.isInteger(stock) ||
            stock < 0) {
            alert("Enter valid product details.");
            return;
        }

        const product = {
            id: crypto.randomUUID(),
            name: name,
            price: price,
            stock: stock
        };

        inventory.push(product);

        saveInventory();
        displayInventory();
        updateProductDropdown();

        this.reset();

        alert("Product added successfully!");

    });


/* ==================================
   21. DISPLAY INVENTORY
================================== */

function displayInventory() {

    const table = document
        .getElementById("inventory-items");

    table.innerHTML = "";

    inventory.forEach(product => {

        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.textContent = product.name;

        const priceCell = document.createElement("td");
        priceCell.textContent = money(product.price);

        const stockCell = document.createElement("td");
        stockCell.textContent = product.stock;

        const statusCell = document.createElement("td");

        statusCell.textContent =
            product.stock === 0 ? "Out of Stock" :
            product.stock <= 10 ? "Low Stock" :
            "In Stock";

        const actionCell = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {
            editProduct(product.id);
        });

        actionCell.appendChild(editButton);

        row.append(
            nameCell,
            priceCell,
            stockCell,
            statusCell,
            actionCell
        );

        table.appendChild(row);

    });

    document.getElementById("inventory-count")
        .textContent = inventory.length;

    document.getElementById("inventory-units")
        .textContent = inventory.reduce(
            (sum, p) => sum + p.stock, 0
        );

    document.getElementById("low-stock-count")
        .textContent = inventory.filter(
            p => p.stock <= 10
        ).length;

}


/* ==================================
   22. EDIT PRODUCT
================================== */

function editProduct(id) {

    const product = inventory.find(p => p.id === id);

    if (!product) return;

    const newPrice = prompt(
        "Enter new price:",
        product.price
    );

    if (newPrice === null) return;

    const newStock = prompt(
        "Enter new stock quantity:",
        product.stock
    );

    if (newStock === null) return;

    const price = Number(newPrice);
    const stock = Number(newStock);

    if (!Number.isFinite(price) || price <= 0 ||
        !Number.isInteger(stock) || stock < 0) {
        alert("Invalid price or stock quantity.");
        return;
    }

    product.price = price;
    product.stock = stock;

    saveInventory();
    displayInventory();
    updateProductDropdown();

}


/* ==================================
   23. UPDATE PRODUCT DROPDOWN
================================== */

function updateProductDropdown() {

    // Replace the old hardcoded product list
    productSelect.innerHTML =
        '<option value="">Choose a product</option>';

    inventory.forEach(product => {

        const option = document.createElement("option");

        option.value = product.id;

        option.textContent =
            product.name + " - " + money(product.price);

        option.disabled = product.stock === 0;

        productSelect.appendChild(option);

    });

}


/* ==================================
   24. LOAD INVENTORY
================================== */

displayInventory();
updateProductDropdown();



/* ==================================
   25. COMPLETE SALE AND REDUCE STOCK
================================== */

function completeInventorySale(receiptId) {

    const sales = getSales();

    // Do not process the same receipt twice.
    if (sales.some(sale => sale.id === receiptId)) {
        return false;
    }

    // Check all stock again before completing.
    for (const item of cart) {

        const product = inventory.find(
            p => p.id === item.id
        );

        if (!product || product.stock < item.quantity) {
            alert("Insufficient stock: " + item.name);
            return false;
        }

    }

    // Reduce available quantities.
    cart.forEach(item => {

        const product = inventory.find(
            p => p.id === item.id
        );

        product.stock -= item.quantity;

    });

    saveInventory();
    displayInventory();
    updateProductDropdown();

    return true;
}

/* ==================================
   26. ADMIN DASHBOARD STATISTICS
================================== */

function updateAdminDashboard() {

    const products = getInventory();
    const sales = getSales();

    const stockUnits = products.reduce(
        (total, product) => total + product.stock,
        0
    );

    const revenue = sales.reduce(
        (total, sale) => total + sale.total,
        0
    );

    document.getElementById("admin-products")
        .textContent = products.length;

    document.getElementById("admin-stock")
        .textContent = stockUnits;

    document.getElementById("admin-transactions")
        .textContent = sales.length;

    document.getElementById("admin-revenue")
        .textContent = money(revenue);

}

