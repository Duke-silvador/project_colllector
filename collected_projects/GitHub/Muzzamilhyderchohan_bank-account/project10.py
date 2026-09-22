class BankAccount:

    def __init__(self, name, balance):
        self.name = name
        self.balance = balance

    def deposit(self, amount):
        if amount > 0:
            self.balance += amount
            print("Money deposited successfully!")
        else:
            print("Invalid amount!")

    def withdraw(self, amount):
        if amount <= 0:
            print("Invalid amount!")

        elif amount > self.balance:
            print("Insufficient balance!")

        else:
            self.balance -= amount
            print("Money withdrawn successfully!")

    def check_balance(self):
        print("Account Holder:", self.name)
        print("Balance:", self.balance)


name = input("Enter account holder name: ")
balance = float(input("Enter initial balance: "))

account = BankAccount(name, balance)


while True:
    print("\n--- Bank Account System ---")
    print("1. Check Balance")
    print("2. Deposit Money")
    print("3. Withdraw Money")
    print("4. Exit")

    choice = input("Enter your choice: ")

    if choice == "1":
        account.check_balance()

    elif choice == "2":
        try:
            amount = float(input("Enter deposit amount: "))
            account.deposit(amount)
        except ValueError:
            print("Invalid input! Enter a number.")

    elif choice == "3":
        try:
            amount = float(input("Enter withdrawal amount: "))
            account.withdraw(amount)
        except ValueError:
            print("Invalid input! Enter a number.")

    elif choice == "4":
        print("Thank you for using Bank Account System!")
        break

    else:
        print("Invalid choice! Try again.")
# concept: Class → BankAccount ka blueprint, Constructor → account data set karta hai, self → current object ko refer karta hai, Properties → name/balance store karti hain, Methods → deposit/withdraw/check balance perform karte hain, aur invalid withdrawal ko prevent kiya gaya hai        