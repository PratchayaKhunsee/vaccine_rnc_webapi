
const app = require('./main/app');
const routes = require('./main/routes');

routes();
app.listen(process.env.PORT || 8080, () => {
    console.log('App working.');
});