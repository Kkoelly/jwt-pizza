import { test, expect } from "playwright-test-coverage";

test("home page", async ({ page }) => {
    await page.goto("http://localhost:5173/");

    expect(await page.title()).toBe("JWT Pizza");
});

test("purchase with login", async ({ page }) => {
    await page.route("*/**/api/order/menu", async (route) => {
        const menuRes = [
            {
                id: 1,
                title: "Veggie",
                image: "pizza1.png",
                price: 0.0038,
                description: "A garden of delight",
            },
            {
                id: 2,
                title: "Pepperoni",
                image: "pizza2.png",
                price: 0.0042,
                description: "Spicy treat",
            },
        ];
        expect(route.request().method()).toBe("GET");
        await route.fulfill({ json: menuRes });
    });

    await page.route("*/**/api/franchise", async (route) => {
        const franchiseRes = [
            {
                id: 2,
                name: "LotaPizza",
                stores: [
                    { id: 4, name: "Lehi" },
                    { id: 5, name: "Springville" },
                    { id: 6, name: "American Fork" },
                ],
            },
            {
                id: 3,
                name: "PizzaCorp",
                stores: [{ id: 7, name: "Spanish Fork" }],
            },
            { id: 4, name: "topSpot", stores: [] },
        ];
        expect(route.request().method()).toBe("GET");
        await route.fulfill({ json: franchiseRes });
    });

    await page.route("*/**/api/auth", async (route) => {
        const loginReq = { email: "d@jwt.com", password: "a" };
        const loginRes = {
            user: {
                id: 3,
                name: "Kai Chen",
                email: "d@jwt.com",
                roles: [{ role: "diner" }],
            },
            token: "abcdef",
        };
        expect(route.request().method()).toBe("PUT");
        expect(route.request().postDataJSON()).toMatchObject(loginReq);
        await route.fulfill({ json: loginRes });
    });

    await page.route("*/**/api/order", async (route) => {
        const orderReq = {
            items: [
                { menuId: 1, description: "Veggie", price: 0.0038 },
                { menuId: 2, description: "Pepperoni", price: 0.0042 },
            ],
            storeId: "4",
            franchiseId: 2,
        };
        const orderRes = {
            order: {
                items: [
                    { menuId: 1, description: "Veggie", price: 0.0038 },
                    { menuId: 2, description: "Pepperoni", price: 0.0042 },
                ],
                storeId: "4",
                franchiseId: 2,
                id: 23,
            },
            jwt: "eyJpYXQ",
        };
        expect(route.request().method()).toBe("POST");
        expect(route.request().postDataJSON()).toMatchObject(orderReq);
        await route.fulfill({ json: orderRes });
    });

    await page.goto("http://localhost:5173/");

    // Go to order page
    await page.getByRole("button", { name: "Order now" }).click();

    // Create order
    await expect(page.locator("h2")).toContainText("Awesome is a click away");
    await page.getByRole("combobox").selectOption("4");
    await page
        .getByRole("link", { name: "Image Description Veggie A" })
        .click();
    await page
        .getByRole("link", { name: "Image Description Pepperoni" })
        .click();
    await expect(page.locator("form")).toContainText("Selected pizzas: 2");
    await page.getByRole("button", { name: "Checkout" }).click();

    // Login
    await page.getByPlaceholder("Email address").click();
    await page.getByPlaceholder("Email address").fill("d@jwt.com");
    await page.getByPlaceholder("Email address").press("Tab");
    await page.getByPlaceholder("Password").fill("a");
    await page.getByRole("button", { name: "Login" }).click();

    // Pay
    await expect(page.getByRole("main")).toContainText(
        "Send me those 2 pizzas right now!"
    );
    await expect(page.locator("tbody")).toContainText("Veggie");
    await expect(page.locator("tbody")).toContainText("Pepperoni");
    await expect(page.locator("tfoot")).toContainText("0.008 ₿");
    await page.getByRole("button", { name: "Pay now" }).click();

    // Check balance
    await expect(page.getByText("0.008")).toBeVisible();
});

test("register", async ({ page }) => {
    //register mock
    await page.route("*/**/api/auth", async (route) => {
        const registerReq = {
            name: "jim",
            email: "jim@jwt.com",
            password: "jim",
        };
        const registerRes = {
            user: {
                id: 2,
                name: "jim",
                email: "jim@jwt.com",
                roles: [{ role: "diner" }],
            },
            token: "tttttt",
        };
        expect(route.request().method()).toBe("POST");
        expect(route.request().postDataJSON()).toMatchObject(registerReq);
        await route.fulfill({ json: registerRes });
    });

    // go to register page
    await page.goto("http://localhost:5173/");
    await page.getByRole("link", { name: "Register" }).click();

    await page.getByPlaceholder("Full name").click();
    await page.getByPlaceholder("Full name").fill("jim");
    await page.getByPlaceholder("Full name").press("Tab");
    await page.getByPlaceholder("Email address").fill("jim@jwt.com");
    await page.getByPlaceholder("Email address").press("Tab");
    await page.getByPlaceholder("Password").fill("jim");
    await page.getByRole("button", { name: "Register" }).click();

    await expect(page.locator("h2")).toContainText("The web's best pizza");
});

test("create and delete a store", async ({ page }) => {
    await page.goto("http://localhost:5173/");
    await page.getByRole("link", { name: "Franchise" }).first().click();
    await page.getByRole("link", { name: "login", exact: true }).click();

    //login mock
    await page.route("*/**/api/auth", async (route) => {
        const loginReq = { email: "d@jwt.com", password: "a" };
        const loginRes = {
            user: {
                id: 3,
                name: "Kai Chen",
                email: "d@jwt.com",
                roles: [{ role: "franchisee", objectId: 5 }],
            },
            token: "abcdef",
        };
        expect(route.request().method()).toBe("PUT");
        expect(route.request().postDataJSON()).toMatchObject(loginReq);
        await route.fulfill({ json: loginRes });
    });

    // get franchise mock
    const franchiseName = "pizzaPocket";
    const franchiseId = 2;
    const existingStoreName = "SLC";
    const newStoreName = "Provo";
    const newStoreId = 5;
    const franchiseRes = [
        {
            id: franchiseId,
            name: franchiseName,
            admins: [{ id: 4, name: "pizza franchisee", email: "f@jwt.com" }],
            stores: [{ id: 4, name: existingStoreName, totalRevenue: 0 }],
        },
    ];
    await page.route("*/**/api/franchise/*", async (route) => {
        expect(route.request().method()).toBe("GET");
        await route.fulfill({ json: franchiseRes });
    });

    // create store mock
    await page.route(
        `*/**/api/franchise/${franchiseId}/store`,
        async (route) => {
            const createStoreRes = [
                { franchiseId: franchiseId, name: newStoreName },
            ];
            expect(route.request().method()).toBe("POST");
            await route.fulfill({ json: createStoreRes });
        }
    );

    // delete store mock
    await page.route(
        `*/**/api/franchise/${franchiseId}/store/${newStoreId}`,
        async (route) => {
            const deleteStoreRes = { message: "store deleted" };
            expect(route.request().method()).toBe("DELETE");
            await route.fulfill({ json: deleteStoreRes });
        }
    );

    // Login
    await page.getByPlaceholder("Email address").click();
    await page.getByPlaceholder("Email address").fill("d@jwt.com");
    await page.getByPlaceholder("Email address").press("Tab");
    await page.getByPlaceholder("Password").fill("a");
    await page.getByRole("button", { name: "Login" }).click();

    //create store
    await expect(page.getByText(franchiseName)).toBeVisible();
    await expect(page.getByRole("table")).toContainText(existingStoreName);

    await page.getByRole("button", { name: "Create store" }).click();
    await expect(page.locator("h2")).toContainText("Create store");
    await page.getByPlaceholder("store name").click();
    await page.getByPlaceholder("store name").fill(newStoreName);

    //update get franchise mock response
    franchiseRes[0].stores.push({
        id: newStoreId,
        name: newStoreName,
        totalRevenue: 0,
    });
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText(franchiseName)).toBeVisible();
    await expect(page.getByText(newStoreName)).toBeVisible();

    //Delete store
    const newStoreRow = page.getByRole("row").filter({ hasText: newStoreName });
    await newStoreRow.getByRole("button").filter({ hasText: "Close" }).click();
    await expect(
        page.getByText(
            `Are you sure you want to close the ${franchiseName} store ${newStoreName} ? This cannot be restored. All outstanding revenue with not be refunded.`
        )
    ).toBeVisible();

    //update get franchise mock response
    franchiseRes[0].stores.pop();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("table")).not.toContainText(newStoreName);
});

test("create and delete franchise", async ({ page }) => {
    await page.goto("http://localhost:5173/");

    //login mock
    const adminEmail = "admin@jwt.com";
    await page.route("*/**/api/auth", async (route) => {
        const loginReq = { email: adminEmail, password: "admin" };
        const loginRes = {
            user: {
                id: 3,
                name: "Kai Chen",
                email: adminEmail,
                roles: [{ role: "admin", objectId: 0 }],
            },
            token: "abcdef",
        };
        expect(route.request().method()).toBe("PUT");
        expect(route.request().postDataJSON()).toMatchObject(loginReq);
        await route.fulfill({ json: loginRes });
    });

    //get franchise mock
    const existingFranchiseName = "pizzaPocket";
    const franchiseRes = [
        {
            id: 2,
            name: existingFranchiseName,
            admins: [{ id: 4, name: "admin", email: adminEmail }],
            stores: [{ id: 4, name: "SLC", totalRevenue: 0 }],
        },
    ];
    await page.route("*/**/api/franchise", async (route) => {
        if (route.request().method() !== "GET") {
            await route.fallback();
            return;
        }
        expect(route.request().method()).toBe("GET");
        await route.fulfill({ json: franchiseRes });
    });

    //create franchise mock
    const newFranchiseName = "PIZZAA";
    const newFranchiseId = 7;
    await page.route("*/**/api/franchise", async (route) => {
        if (route.request().method() !== "POST") {
            await route.fallback();
            return;
        }
        const createFranchiseReq = {
            name: newFranchiseName,
            admins: [{ email: adminEmail }],
        };
        const createFranchiseRes = {
            name: newFranchiseName,
            admins: [{ email: adminEmail, id: 7, name: "pizza franchisee" }],
            id: newFranchiseId,
        };

        expect(route.request().method()).toBe("POST");
        expect(route.request().postDataJSON()).toMatchObject(
            createFranchiseReq
        );
        await route.fulfill({ json: createFranchiseRes });
    });

    //delete franchise mock
    await page.route(`*/**/api/franchise/${newFranchiseId}`, async (route) => {
        const deleteFranchiseRes = { message: "franchise deleted" };
        expect(route.request().method()).toBe("DELETE");
        await route.fulfill({ json: deleteFranchiseRes });
    });

    //login
    await page.getByRole("link", { name: "Login" }).click();
    await page.getByPlaceholder("Email address").click();
    await page.getByPlaceholder("Email address").fill(adminEmail);
    await page.getByPlaceholder("Email address").press("Tab");
    await page.getByPlaceholder("Password").fill("admin");
    await page.getByRole("button", { name: "Login" }).click();

    //create franchise
    await page.getByRole("link", { name: "Admin" }).click();
    await expect(page.locator("h2")).toContainText("Mama Ricci's kitchen");
    await expect(page.getByRole("table")).toContainText(existingFranchiseName);

    await page.getByRole("button", { name: "Add Franchise" }).click();
    await expect(page.locator("h2")).toContainText("Create franchise");

    await page.getByPlaceholder("franchise name").click();
    await page.getByPlaceholder("franchise name").fill(newFranchiseName);
    await page.getByPlaceholder("franchise name").press("Tab");
    await page.getByPlaceholder("franchisee admin email").fill(adminEmail);

    //change get franchise response
    franchiseRes.push({
        id: newFranchiseId,
        name: newFranchiseName,
        admins: [{ id: 4, name: "admin", email: adminEmail }],
        stores: [{ id: 4, name: "store", totalRevenue: 0 }],
    });
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("table")).toContainText(newFranchiseName);

    //Delete store
    const newFranchiseRow = page
        .getByRole("row")
        .filter({ hasText: newFranchiseName });
    await newFranchiseRow
        .getByRole("button")
        .filter({ hasText: "Close" })
        .click();
    await expect(
        page.getByText(
            `Are you sure you want to close the ${newFranchiseName} franchise? This will close all associated stores and cannot be restored. All outstanding revenue with not be refunded.`
        )
    ).toBeVisible();

    //update get franchise mock response
    franchiseRes.pop();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("table")).not.toContainText(newFranchiseName);
});

test("page not found", async ({ page }) => {
    await page.goto("http://localhost:5173/a");
    await expect(page.getByText("Oops")).toBeVisible();
});

test("login, logout, and diner dasbhoard", async ({ page }) => {
    await page.goto("http://localhost:5173/");

    //login mock
    await page.route("*/**/api/auth", async (route) => {
        if (route.request().method() !== "PUT") {
            await route.fallback();
            return;
        }
        const loginReq = { email: "d@jwt.com", password: "a" };
        const loginRes = {
            user: {
                id: 3,
                name: "Kai Chen",
                email: "d@jwt.com",
                roles: [{ role: "diner" }],
            },
            token: "abcdef",
        };
        expect(route.request().method()).toBe("PUT");
        expect(route.request().postDataJSON()).toMatchObject(loginReq);
        await route.fulfill({ json: loginRes });
    });

    //logout mock
    await page.route("*/**/api/auth", async (route) => {
        if (route.request().method() !== "DELETE") {
            await route.fallback();
            return;
        }
        const loginRes = { message: "logout successful" };
        expect(route.request().method()).toBe("DELETE");
        await route.fulfill({ json: loginRes });
    });

    //get orders mock
    const orderId = 24;
    const price = 0.05;
    await page.route("*/**/api/order", async (route) => {
        const orderRes = {
            dinerId: 3,
            orders: [
                {
                    id: orderId,
                    franchiseId: 1,
                    storeId: 1,
                    date: "2024-06-05T05:14:40.000Z",
                    items: [
                        {
                            id: 1,
                            menuId: 1,
                            description: "Veggie",
                            price: price,
                        },
                    ],
                },
            ],
            page: 1,
        };
        expect(route.request().method()).toBe("GET");
        await route.fulfill({ json: orderRes });
    });

    // Login
    await page.getByRole("link", { name: "Login" }).click();
    await page.getByPlaceholder("Email address").click();
    await page.getByPlaceholder("Email address").fill("d@jwt.com");
    await page.getByPlaceholder("Email address").press("Tab");
    await page.getByPlaceholder("Password").fill("a");
    await page.getByRole("button", { name: "Login" }).click();

    // //diner dashboard
    await page.getByRole("link", { name: "KC", exact: true }).click();
    await expect(page.getByText("Your pizza kitchen")).toBeVisible();
    //check orders
    await expect(page.getByRole("table")).toContainText(orderId.toString());

    //logout
    await page.getByRole("link", { name: "Logout" }).click();
    await expect(page.getByText("Logout")).not.toBeVisible();
});

test("cancel order", async ({ page }) => {
    await page.route("*/**/api/order/menu", async (route) => {
        const menuRes = [
            {
                id: 1,
                title: "Veggie",
                image: "pizza1.png",
                price: 0.0038,
                description: "A garden of delight",
            },
            {
                id: 2,
                title: "Pepperoni",
                image: "pizza2.png",
                price: 0.0042,
                description: "Spicy treat",
            },
        ];
        expect(route.request().method()).toBe("GET");
        await route.fulfill({ json: menuRes });
    });

    await page.route("*/**/api/franchise", async (route) => {
        const franchiseRes = [
            {
                id: 2,
                name: "LotaPizza",
                stores: [
                    { id: 4, name: "Lehi" },
                    { id: 5, name: "Springville" },
                    { id: 6, name: "American Fork" },
                ],
            },
            {
                id: 3,
                name: "PizzaCorp",
                stores: [{ id: 7, name: "Spanish Fork" }],
            },
            { id: 4, name: "topSpot", stores: [] },
        ];
        expect(route.request().method()).toBe("GET");
        await route.fulfill({ json: franchiseRes });
    });

    await page.route("*/**/api/auth", async (route) => {
        const loginReq = { email: "d@jwt.com", password: "a" };
        const loginRes = {
            user: {
                id: 3,
                name: "Kai Chen",
                email: "d@jwt.com",
                roles: [{ role: "diner" }],
            },
            token: "abcdef",
        };
        expect(route.request().method()).toBe("PUT");
        expect(route.request().postDataJSON()).toMatchObject(loginReq);
        await route.fulfill({ json: loginRes });
    });

    await page.goto("http://localhost:5173/");
    await page.getByRole("link", { name: "Login" }).click();

    // Login
    await page.getByPlaceholder("Email address").click();
    await page.getByPlaceholder("Email address").fill("d@jwt.com");
    await page.getByPlaceholder("Email address").press("Tab");
    await page.getByPlaceholder("Password").fill("a");
    await page.getByRole("button", { name: "Login" }).click();

    // Go to order page
    await page.getByRole("link", { name: "Order" }).click();

    // Create order
    await expect(page.locator("h2")).toContainText("Awesome is a click away");
    await page.getByRole("combobox").selectOption("5");
    await page
        .getByRole("link", { name: "Image Description Veggie A" })
        .click();

    await expect(page.locator("form")).toContainText("Selected pizzas: 1");
    await page.getByRole("button", { name: "Checkout" }).click();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.locator("h2")).toContainText("Awesome is a click away");
});
