// Load environment variables first, before any other imports
import dotenv from "dotenv"
dotenv.config()

import createError from "http-errors"
import express from "express"
import path from "path"
import cors from "cors"
import indexRouter from "./routes/index"

var app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000', // Frontend development server
    'http://localhost:3001', // Resolver itself
    'http://127.0.0.1:3000', // Alternative frontend URL
    'http://127.0.0.1:3001'  // Alternative resolver URL
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));


app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req: any, res: any, next: any) {
  next(createError(404));
});



// error handler
app.use(function(err: any, req: any, res: any, next: any) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
});

module.exports = app;
