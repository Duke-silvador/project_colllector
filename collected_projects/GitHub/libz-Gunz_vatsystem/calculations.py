from vat_engine import calculate_vat_return

def calculate_net_vat(output_vat, input_vat, adjustments=0):
    return round(output_vat + adjustments - input_vat, 2)
