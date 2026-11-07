from torch import no_grad
from torch.utils.data import DataLoader


"""
Functions you should use.
Please avoid importing any other functions or modules.
Your code will not pass if the gradescope autograder detects any changed imports
"""
from torch import optim, tensor
from losses import regression_loss, digitclassifier_loss, languageid_loss, digitconvolution_Loss
from torch import movedim


"""
##################
### QUESTION 1 ###
##################
"""


def train_perceptron(model, dataset):
    """
    Train the perceptron until convergence.
    You can iterate through DataLoader in order to 
    retrieve all the batches you need to train on.

    Each sample in the dataloader is in the form {'x': features, 'label': label} where label
    is the item we need to predict based off of its features.
    """
    with no_grad():
        dataloader = DataLoader(dataset, batch_size=1, shuffle=True)
        "*** YOUR CODE HERE ***"
        while True:
            mistakes = 0
            for batch in dataloader:
                x = batch['x']
                y = batch['label'].item()
                if model.get_prediction(x) != y:   # dự đoán sai
                    model.w += y * x               # kéo w về phía đáp án đúng
                    mistakes += 1
            if mistakes == 0:                      # cả lượt không sai: xong
                break


def train_regression(model, dataset):
    """
    Trains the model.

    In order to create batches, create a DataLoader object and pass in `dataset` as well as your required 
    batch size. You can look at PerceptronModel as a guideline for how you should implement the DataLoader

    Each sample in the dataloader object will be in the form {'x': features, 'label': label} where label
    is the item we need to predict based off of its features.

    Inputs:
        model: Pytorch model to use
        dataset: a PyTorch dataset object containing data to be trained on
        
    """
    "*** YOUR CODE HERE ***"
    dataloader = DataLoader(dataset, batch_size=25, shuffle=True)
    optimizer = optim.Adam(model.parameters(), lr=0.005)

    for epoch in range(2000):
        total, count = 0.0, 0
        for batch in dataloader:
            x = batch['x']
            y = batch['label']
            optimizer.zero_grad()
            loss = regression_loss(model(x), y)
            loss.backward()
            optimizer.step()
            total += loss.item() * len(x)
            count += len(x)
        avg_loss = total / count
        if epoch % 50 == 0:
            print(f"Epoch {epoch}: loss = {avg_loss:.5f}")
        if avg_loss < 0.01:        # dừng sớm, thấp hơn ngưỡng 0.02 để có dư địa
            break


def train_digitclassifier(model, dataset):
    """
    Trains the model.
    """
    model.train()
    """ YOUR CODE HERE """
    dataloader = DataLoader(dataset, batch_size=100, shuffle=True)
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=3, gamma=0.5)

    for epoch in range(30):
        for batch in dataloader:
            x = batch['x']
            y = batch['label']
            optimizer.zero_grad()
            loss = digitclassifier_loss(model(x), y)
            loss.backward()
            optimizer.step()
        scheduler.step()                      # giảm lr dần sau mỗi 3 epoch

        val_acc = dataset.get_validation_accuracy()
        print(f"Epoch {epoch + 1}: validation accuracy = {val_acc:.4f}")
        if val_acc >= 0.982:                  # ngưỡng dừng cao hơn
            break

def train_languageid(model, dataset):
    """
    Trains the model.

    Note that when you iterate through dataloader, each batch will returned as its own vector in the form
    (batch_size x length of word x self.num_chars). However, in order to run multiple samples at the same time,
    get_loss() and run() expect each batch to be in the form (length of word x batch_size x self.num_chars), meaning
    that you need to switch the first two dimensions of every batch. This can be done with the movedim() function 
    as follows:

    movedim(input_vector, initial_dimension_position, final_dimension_position)

    For more information, look at the pytorch documentation of torch.movedim()
    """
    model.train()
    "*** YOUR CODE HERE ***"
    dataloader = DataLoader(dataset, batch_size=64, shuffle=True)
    optimizer = optim.Adam(model.parameters(), lr=0.002)

    for epoch in range(30):
        for batch in dataloader:
            x = movedim(batch['x'], 0, 1)    # (batch, L, 47) -> (L, batch, 47)
            y = batch['label']

            optimizer.zero_grad()            # xóa gradient của lượt trước
            y_pred = model(x)                # dự đoán
            loss = languageid_loss(y_pred, y)
            loss.backward()                  # tính gradient
            optimizer.step()                 # cập nhật trọng số

        val_acc = dataset.get_validation_accuracy()
        print(f"Epoch {epoch + 1}: validation accuracy = {val_acc:.4f}")
        if val_acc >= 0.86:                  # dừng sớm khi đủ tốt
            break


def Train_DigitConvolution(model, dataset):
    """
    Trains the model.
    """
    """ YOUR CODE HERE """
    model.train()
    dataloader = DataLoader(dataset, batch_size=50, shuffle=True)
    optimizer = optim.Adam(model.parameters(), lr=0.002)

    for epoch in range(15):
        for batch in dataloader:
            x = batch['x']
            y = batch['label']
            optimizer.zero_grad()
            loss = digitconvolution_Loss(model(x), y)
            loss.backward()
            optimizer.step()

        val_acc = dataset.get_validation_accuracy()
        print(f"Epoch {epoch + 1}: validation accuracy = {val_acc:.4f}")
        if val_acc >= 0.86:     # đề yêu cầu 80%, đặt cao hơn để có dư địa
            break
