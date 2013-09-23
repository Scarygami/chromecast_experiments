package at.foldedsoft.slideshowcast;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.MalformedURLException;
import java.net.URL;
import javax.net.ssl.HttpsURLConnection;
import org.json.JSONException;
import org.json.JSONObject;

import android.content.Context;
import android.os.AsyncTask;
import android.util.Log;

import com.google.android.gms.auth.GoogleAuthException;
import com.google.android.gms.auth.GoogleAuthUtil;

public class PicasaAlbumsTask  extends AsyncTask<Void, Void, Boolean> {

  AsyncReceiver receiver;
  Context context;
  String account;
  String scopes;
  String id;
  //TrackerDBAdapter db;

  PicasaAlbumsTask(AsyncReceiver receiver, /*TrackerDBAdapter db,*/ Context context, String account, String id, String scopes) {
    this.receiver = receiver;
    this.context = context;
    this.account = account;
    this.scopes = scopes;
    this.id = id;
    //this.db = db;
  }

  @Override
  protected Boolean doInBackground(Void... params) {
    URL url;
    HttpsURLConnection urlConnection;
    InputStream in;
    String result = "";
    String line;
    String accessToken = null;
    try {
      accessToken = GoogleAuthUtil.getToken(this.context, this.account, this.scopes);
    } catch (GoogleAuthException e) {
      e.printStackTrace();
      return false;
    } catch (IOException e) {
      e.printStackTrace();
      return false;
    }
    if (accessToken == null) return false;
    try {
      url = new URL("https://picasaweb.google.com/data/feed/api/user/default?alt=json&access=public&type=album");
    } catch (MalformedURLException e) {
      e.printStackTrace();
      return false;
    }
    try {
      urlConnection = (HttpsURLConnection) url.openConnection();
      urlConnection.setRequestProperty("Authorization", "Bearer " + accessToken);
      in = new BufferedInputStream(urlConnection.getInputStream());
      BufferedReader reader = new BufferedReader(new InputStreamReader(in));
      while((line = reader.readLine()) != null) {
        result += " " + line;
      }
    } catch (IOException e) {
      e.printStackTrace();
      return false;
    }
    JSONObject json;
    try {
      json = new JSONObject(result);
      if (json.has("feed")) {
        json = json.optJSONObject("feed");
        // TODO: handle feed
        Log.d("picasa", json.toString());
        return true;
      } else {
        return false;
      }
    } catch (JSONException e) {
      e.printStackTrace();
      return false;
    }
  }

  protected void onPostExecute(Boolean result) {
    if (result) {
      receiver.finished(1);
    }
  }
}
