package at.foldedsoft.slideshowcast;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

import javax.net.ssl.HttpsURLConnection;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.content.Context;
import android.os.AsyncTask;
import android.util.Log;

import com.google.android.gms.auth.GoogleAuthException;
import com.google.android.gms.auth.GoogleAuthUtil;

public class PicasaAlbumsTask  extends AsyncTask<Void, Void, List<PicasaAlbum>> {

  AsyncReceiver<List<PicasaAlbum>> receiver;
  Context context;
  String account;
  String scopes;
  String id;

  PicasaAlbumsTask(AsyncReceiver<List<PicasaAlbum>> receiver, Context context, String account, String id, String scopes) {
    this.receiver = receiver;
    this.context = context;
    this.account = account;
    this.scopes = scopes;
    this.id = id;
  }

  @Override
  protected List<PicasaAlbum> doInBackground(Void... params) {
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
      return null;
    } catch (IOException e) {
      e.printStackTrace();
      return null;
    }
    if (accessToken == null) return null;
    try {
      url = new URL("https://picasaweb.google.com/data/feed/api/user/default?alt=json&access=public&type=album");
    } catch (MalformedURLException e) {
      e.printStackTrace();
      return null;
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
      return null;
    }
    JSONObject json;
    try {
      json = new JSONObject(result);
      if (json.has("feed")) {
        json = json.optJSONObject("feed");
        List<PicasaAlbum> albums = new ArrayList<PicasaAlbum>();
        if (json.has("entry")) {
          JSONArray entries = json.optJSONArray("entry");
          for (int i = 0; i < entries.length(); i++) {
            JSONObject entry = entries.optJSONObject(i);
            if (entry != null) {
              PicasaAlbum album = new PicasaAlbum(entry);
              if (album.getName() != "" && album.getPhotos() > 3) {
                albums.add(album);
              }
            }
          }
        }
        Log.d("picasa", json.toString());
        return albums;
      } else {
        return null;
      }
    } catch (JSONException e) {
      e.printStackTrace();
      return null;
    }
  }

  protected void onPostExecute(List<PicasaAlbum> result) {
    if (result != null) {
      receiver.finished(result);
    }
  }
}
