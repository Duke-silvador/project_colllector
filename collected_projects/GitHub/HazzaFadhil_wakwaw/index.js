import express from 'express';

const myapp = express();

// Middleware agar Express bisa membaca data JSON yang dikirim dari client (untuk POST, PUT, PATCH)
myapp.use(express.json());

// 1. Method GET (Biasanya untuk mengambil / membaca data)
myapp.get('/mahasiswa', (req, res) => {
  res.json({
    method: 'GET',
    pesan: 'ini adalah method get'
  });
});

// 2. Method POST (Biasanya untuk membuat / menambah data baru)
myapp.post('/mahasiswa', (req, res) => {
  // Anda bisa menerima data yang dikirim client melalui req.body
  const dataBaru = req.body;

  res.json({
    method: 'POST',
    pesan: 'ini adalah method post',
    dataDiterima: dataBaru
  });
});

// 3. Method PUT (Biasanya untuk memperbarui seluruh data secara total)
myapp.put('/mahasiswa/:id', (req, res) => {
  const id = req.params.id;
  const dataUpdate = req.body;

  res.json({
    method: 'PUT',
    pesan: `ini adalah method put untuk mengubah total data mahasiswa dengan ID ${id}`,
    dataBaru: dataUpdate
  });
});

// 4. Method PATCH (Biasanya untuk memperbarui sebagian data saja)
myapp.patch('/mahasiswa/:id', (req, res) => {
  const id = req.params.id;
  const dataPatch = req.body;

  res.json({
    method: 'PATCH',
    pesan: `ini adalah method patch untuk mengubah sebagian data mahasiswa dengan ID ${id}`,
    dataDiubah: dataPatch
  });
});

// 5. Method DELETE (Biasanya untuk menghapus data)
myapp.delete('/mahasiswa/:id', (req, res) => {
  const id = req.params.id;

  res.json({
    method: 'DELETE',
    pesan: `ini adalah method delete untuk menghapus data mahasiswa dengan ID ${id}`
  });
});

myapp.listen(3000, () => {
  console.log('Server berjalan di port 3000');
});