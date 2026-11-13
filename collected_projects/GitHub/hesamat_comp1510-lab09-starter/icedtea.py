MENU = {"peach": 5.00, "lemon": 3.00, "green": 4.00, "mango": 6.00}
SIZES = {"small": 0.85, "medium": 1.00, "large": 1.25}
SUGAR_LEVELS = ("none", "less", "half", "regular")
ICE_LEVELS = ("none", "less", "regular")
STAMPS_PER_DISCOUNT = 10
DISCOUNT_AMOUNT = 1.00


def tea_price(tea, size="medium"):
    pass


def loyalty_discount(total, stamps=0):
    pass


def menu_board(size="medium"):
    pass


def affordable_teas(budget, size="medium"):
    pass


def place_order(tea, size="medium", sweetness="regular",
                ice="regular", cups=1):
    pass


def take_add_ins(add_in: str, order_add_ins: list = []) -> list:
    """
    Add one add-in to an order and return the order's add-ins.

    :param add_in: the name of one add-in
    :param order_add_ins: the add-ins already on the order
    :postcondition: a supplied list gains the add-in in place
    :return: the order's add-ins, with add_in at the end
    """
    order_add_ins.append(add_in)
    return order_add_ins


def main():
    """
    Take a few orders at The Steeped Leaf.
    """
    print("=== The Steeped Leaf ===\n")

    print("Two customers order add-ins:")
    first = take_add_ins("lemon slice")
    print(f"first order:  {first}")
    second = take_add_ins("aloe")
    print(f"second order: {second}")


if __name__ == "__main__":
    main()
