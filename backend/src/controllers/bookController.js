import { bookService } from '../services/bookService.js';

export async function getBookInfo(req, res, next) {
  try {
    const info = await bookService.getBookInfo();
    res.status(200).json(info);
  } catch (err) {
    next(err);
  }
}
