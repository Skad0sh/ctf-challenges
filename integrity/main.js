// Reads a cookie with specified name. Returns null if no such cookie present
function readCookie(name) {
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for (let i=0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0)===' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

// As we are a professional company offering XSS recipes, we want to create a nice user experience where the user can have a cool name that is shown on the screen
// Our advisors say that it should be editable through the webinterface but I think our users are smart enough to just edit it in the cookies.
// This way no XSS will ever be possible because you cannot change the cookie unless you do it yourself!
function welcomeUser(username) {
    let welcomeMessage = document.querySelector("#welcome");
    welcomeMessage.innerHTML = `Welcome ${username}`;
}

// Function to generate the recipe text.
function generateRecipeText(recipe) {
    let title = document.querySelector("#title");
    let ingredients = document.querySelector("#ingredients");
    let payload = document.querySelector("#payload");
    let steps = document.querySelector("#steps");

    title.innerText = `Recipe: ${recipe.title}`;

    let ingredient_text = '';
    for (let ingredient of recipe.ingredients) {
        ingredient_text += `- ${ingredient}\n`;
    }
    ingredients.innerText = ingredient_text;

    payload.innerText = `Payload: ${recipe.payload}`;

    let steps_text = '';
    for (let step of recipe.steps) {
        steps_text += `- ${step}\n`;
    }
    steps.innerText = steps_text;
}

// This thing is called after the page loaded or something. Not too sure...
const handleLoad = () => {
    let username = readCookie('username');
    if (!username) {
        document.cookie = `username=unknownUser${Math.floor(Math.random() * (1000 + 1))};path=/`;
    }

    let recipe = deparam(atob(new URL(location.href).searchParams.get('recipe')));

    ga('create', 'ga_r33l', 'auto');

    welcomeUser(readCookie('username'));
    generateRecipeText(recipe);
    console.log(recipe)
}

window.addEventListener("load", handleLoad);