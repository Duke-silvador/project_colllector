def get_number(prompt):
    """Prompt for a number, re-asking until valid."""
    while True:
        value = input(prompt).strip()
        try:
            return float(value)
        except ValueError:
            print("Invalid input. Please enter a numeric value (e.g., 4 or 3.5).")
def print_menu():
    print("\n===== Calculator Master =====")
    print("1. Addition")
    print("2. Subtraction")
    print("3. Multiplication")
    print("4. Division")
    print("5. Exit")
    print("==============================")
def main():
    while True:
        print_menu()
        choice = input("Select an option (1-5): ").strip()
 
        if choice == "5":
            print("Exiting Calculator Master. Goodbye!")
            break
        if choice not in {"1", "2", "3", "4"}:
            print("Invalid option. Please choose a number between 1 and 5.")
            continue
 # Operations will be implemented on their own branches
        print("This operation is not implemented yet.")
if __name__ == "__main__":
    main()
