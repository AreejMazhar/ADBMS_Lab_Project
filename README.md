# ADBMS_Lab_Project
> [!IMPORTANT]
> Ensure you have [node.js](https://nodejs.org/en/download) installed on your system.
> You can confirm that you do by running `node -v` and `npm -v`

To setup this project:
1. Clone this reposoitory.
2. Open your terminal/cmd and `cd` to the project directory.
3. Run `npm install` to download the required packages.
4. Create a `.env` file at the root of the project directory containing the following variables on separate lines:
   - `MONGO-URI=<mongodb_connection_string>`; you can obtain your connection string and database user credentials from Atlas.
   - `PORT=5000`; the port the web interface will appear at.
5. You can now run `npm start` and the web frontend should startup and connect to Atlas. You can access it at `localhost:5000` in your browser.