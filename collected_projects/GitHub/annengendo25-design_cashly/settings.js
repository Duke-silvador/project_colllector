const settingsForm=document.getElementById("settings-form");
const fullNameInput=document.getElementById("full-name");
const emailInput=document.getElementById("email-address");
const currencySelect=document.getElementById("currency-select");
const spendingReminder=document.getElementById("spending-reminder");

settingsForm.addEventListener("submit",function(event){
    event.preventDefault();
    const userName=fullNameInput.value.trim();
    const userEmail=emailInput.value.trim();
    localStorage.setItem("cashlyUserName",userName);
    localStorage.setItem("cashlyUserEmail",userEmail);
    const profileInitial=document.getElementById("profile-initial");
    if(profileInitial){
        profileInitial.textContent=userName.charAt(0).toUpperCase() || "N";
    }
    alert("Profile information saved successfully!");
});
fullNameInput.value=localStorage.getItem("cashlyUserName") ||"";
emailInput.value=localStorage.getItem("cashlyUserEmail") ||"";

currencySelect.addEventListener("change",function(){
    const selectedCurrency=currencySelect.value;
    localStorage.setItem("cashlyCurrency",selectedCurrency);
    alert("Currency preference saved!");
});
currencySelect.value=localStorage.getItem("cashlyCurrency") ||"KES";

spendingReminder.addEventListener("change",function(){
    localStorage.setItem(
        "cashlySpendingReminder",spendingReminder.checked ? "enabled":"disabled"
    );
    alert(
        spendingReminder.checked ? "Spending reminders enabled!":"Spending reminders disabled"
    );
});
const savedReminder=localStorage.getItem("cashlySpendingReminder");
if(savedReminder !==null){
    spendingReminder.checked=savedReminder==="enabled";
}

const categoryForm=document.getElementById("category-form");
const categoryNameInput=document.getElementById("category-name");
const categoryTypeSelect=document.getElementById("category-type");
const categoryList=document.getElementById("category-list");
let customCategories=JSON.parse(
    localStorage.getItem("cashlyCustomCategories")
) ||[];
function displayCategories(){
    categoryList.innerHTML="";
    if(customCategories.length===0){
        categoryList.textContent="No custom categories added yet.";
        return;
    }
    customCategories.forEach(function(category,index){
        const categoryItem=document.createElement("div");
        categoryItem.classList.add("custom-category-item");
        const categoryInfo=document.createElement("span");
        categoryInfo.textContent=category.name+"("+category.type+")";
        const deleteButton=document.createElement("button");
        deleteButton.textContent="Delete";
        deleteButton.type="button";
        deleteButton.addEventListener("click",function(){
            deleteCategory(index);
        });
        categoryItem.appendChild(categoryInfo);
        categoryItem.appendChild(deleteButton);
        categoryList.appendChild(categoryItem);
    });
}
function saveCategories(){
    localStorage.setItem(
        "cashlyCustomCategories",JSON.stringify(customCategories)
    );
}
categoryForm.addEventListener("submit",function(event){
    event.preventDefault();
    const categoryName=categoryNameInput.value.trim();
    const categoryType=categoryTypeSelect.value;
    if(categoryName===""){
        alert("Please enter a category name.");
        return;
    }
    const alreadyExists=customCategories.some(function(category){
        return category.name.toLowerCase()===categoryName.toLowerCase()&&category.type===categoryType;
    });
    if (alreadyExists){
        alert("This category already exists for that type.");
        return;
    }
    customCategories.push({
        name:categoryName,
        type:categoryType
    });
    saveCategories();
    displayCategories();
    categoryForm.reset();
    alert("Category added successfully!");
});
function deleteCategory(index){
    const category=customCategories[index];
    const transactions=JSON.parse(
        localStorage.getItem("cashlyTransactions")
    ) || [];
    const categoryIsUsed=transactions.some(function(transaction){
        return transaction.category.toLowerCase()===category.name.toLowerCase()&&transaction.type===category.type;
    });
    if (categoryIsUsed){
        alert("You cannot delete this category because it is being used by a transaction.");
        return;
    }
    const confirmDelete=confirm(
        "Are you sure you want to delete"+category.name+"?"
    );
    if (confirmDelete){
        customCategories.splice(index,1);
        saveCategories();
        displayCategories();
        alert("Category deleted successfully!");
    }
}
displayCategories();

const clearDataBtn=document.getElementById("clear-data-btn");
clearDataBtn.addEventListener("click",function(){
    const confirmClear=confirm("Are you sure you want to clear all your transactions and custom categories?This action cannot be undone.");
    if(confirmClear){
        localStorage.setItem("cashlyTransactions",JSON.stringify([]));
        localStorage.setItem("cashlyCustomCategories",JSON.stringify([]));
        alert("All transactions and custom categories have being cleared!");
    }
});