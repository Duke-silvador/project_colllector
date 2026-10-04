stock_prices = {
    "APPLE": 180,
    "TSLA": 350,
    "GOOGLE": 590,
    "AMAZN": 620
}

print("Welcome to the Stock Tracker!")

total_investment = 0

while True:
    choosen_stock = input("\nEnter a stock name (OR type 'done' to stop): ").strip().upper()
    
    if choosen_stock == 'DONE':
        print("\nYour total portfolio value is $", total_investment)

        with open("portfolio.txt", "w") as file:
            file.write("Total Portfolio Value: $" + str(total_investment))
            
        print("Portfolio successfully saved to portfolio.txt")
        break

    elif choosen_stock in stock_prices:
        print("Stock Found!")

        price = stock_prices[choosen_stock]
        quantity = int(input("How many shares do you want? "))   
        
        total_cost = price * quantity
        print("Cost for this transaction: $", total_cost)

        total_investment = total_investment + total_cost

    else:
        print("Sorry, that stock is not on the list.")