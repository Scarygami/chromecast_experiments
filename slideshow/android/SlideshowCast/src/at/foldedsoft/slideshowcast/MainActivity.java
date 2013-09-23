package at.foldedsoft.slideshowcast;

import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GooglePlayServicesUtil;
import com.google.android.gms.common.SignInButton;
import com.google.android.gms.common.GooglePlayServicesClient.ConnectionCallbacks;
import com.google.android.gms.common.GooglePlayServicesClient.OnConnectionFailedListener;
import com.google.android.gms.plus.PlusClient;
import com.google.android.gms.plus.PlusClient.OnAccessRevokedListener;
import com.google.android.gms.plus.model.people.Person;
import com.google.cast.CastContext;
import com.google.cast.CastDevice;
import com.google.cast.MediaRouteAdapter;
import com.google.cast.MediaRouteHelper;
import com.google.cast.MediaRouteStateChangeListener;

import android.os.Bundle;
import android.support.v4.app.FragmentActivity;
import android.support.v7.app.MediaRouteButton;
import android.support.v7.media.MediaRouteSelector;
import android.support.v7.media.MediaRouter;
import android.support.v7.media.MediaRouter.RouteInfo;

import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.widget.GridView;
import android.widget.TextView;
import android.content.Intent;
import android.content.IntentSender;

public class MainActivity extends FragmentActivity
	implements ConnectionCallbacks,
			       OnConnectionFailedListener,
             View.OnClickListener,
             OnAccessRevokedListener,
             MediaRouteAdapter {

  private static final int REQUEST_CODE_SIGN_IN = 1;

  private PlusClient mPlusClient;
  private ConnectionResult mConnectionResult;
  private Menu mMenu;
  private SignInButton mSignInButton;
  private View mContent;
  private TextView mUserInfo;
  private GridView mGridView;
  private boolean mConnected = false;
  private CharSequence mUserId;
  private CharSequence mUserName;
  private CharSequence mUserAccount;
  private SearchReceiver mReceiver = new SearchReceiver();

  private CastContext mCastContext; 
  private MediaRouteButton mMediaRouteButton;
  private MediaRouter mMediaRouter;
  private MediaRouteSelector mMediaRouteSelector;
  private MediaRouter.Callback mMediaRouterCallback;
  private CastDevice mSelectedDevice;
  private MediaRouteStateChangeListener mRouteStateListener;
	
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.main);
    
    mSignInButton = (SignInButton) findViewById(R.id.sign_in_button);
    mSignInButton.setOnClickListener(this);

    mContent = findViewById(R.id.content);
    mUserInfo = (TextView) findViewById(R.id.user_info);
    mGridView = (GridView) findViewById(R.id.album_grid);
    
    mPlusClient =
        new PlusClient.Builder(this, this, this)
                .setScopes("https://www.googleapis.com/auth/plus.login",
                           "https://picasaweb.google.com/data/")
                .build();
    
    mCastContext = new CastContext(this);
    MediaRouteHelper.registerMinimalMediaRouteProvider(mCastContext, this);
    mMediaRouter = MediaRouter.getInstance(this);
    mMediaRouteSelector = MediaRouteHelper.buildMediaRouteSelector(
            MediaRouteHelper.CATEGORY_CAST);
    mMediaRouteButton = (MediaRouteButton) findViewById(R.id.media_route_button);
    mMediaRouteButton.setRouteSelector(mMediaRouteSelector);
    mMediaRouterCallback = new MyMediaRouterCallback();
  }

  @Override
  public boolean onCreateOptionsMenu(Menu menu) {
    // Inflate the menu; this adds items to the action bar if it is present.
    MenuInflater inflater = getMenuInflater();
    inflater.inflate(R.menu.menu, menu);
    mMenu = menu;
    mMenu.findItem(R.id.action_signout).setVisible(mConnected);
    mMenu.findItem(R.id.action_revoke).setVisible(mConnected);
    return true;
  }
  
  @Override
  public boolean onOptionsItemSelected(MenuItem item) {
    // handle item selection
    switch (item.getItemId()) {
      case R.id.action_signout:
        if (mPlusClient.isConnected()) {
          mPlusClient.clearDefaultAccount();
          mPlusClient.disconnect();
          mConnected = false;
          mUserId = null;
          mUserName = null;
          mUserAccount = null;
          updateUI();
          mPlusClient.connect();
        }
        return true;
      case R.id.action_revoke:
        if (mPlusClient.isConnected()) {
            mPlusClient.revokeAccessAndDisconnect(this);
            mConnected = false;
          mUserId = null;
          mUserName = null;
          mUserAccount = null;
          updateUI();
        }
        return true;
    }
    return true;
  }

  @Override
  public void onStart() {
    super.onStart();
    mMediaRouter.addCallback(mMediaRouteSelector, mMediaRouterCallback,
        MediaRouter.CALLBACK_FLAG_REQUEST_DISCOVERY);
    mPlusClient.connect();
    updateUI();
  }

  @Override
  public void onStop() {
      mPlusClient.disconnect();
      mMediaRouter.removeCallback(mMediaRouterCallback);
      super.onStop();
  }

  @Override
  public void onDestroy() {
    MediaRouteHelper.unregisterMediaRouteProvider(mCastContext);
    mCastContext.dispose();
    super.onDestroy();
  }
  
  @Override
  public void onClick(View view) {
    if (view.getId() == R.id.sign_in_button) {
    int available = GooglePlayServicesUtil.isGooglePlayServicesAvailable(this);
      if (available != ConnectionResult.SUCCESS) {
        return;
      }

      try {
        mConnectionResult.startResolutionForResult(this, REQUEST_CODE_SIGN_IN);
      } catch (IntentSender.SendIntentException e) {
        // Fetch a new result to start.
        mPlusClient.connect();
      }
    }
  }
  
  
  @Override
  public void onActivityResult(int requestCode, int resultCode, Intent data) {
    if (requestCode == REQUEST_CODE_SIGN_IN) {
      if (resultCode == android.app.Activity.RESULT_OK && !mPlusClient.isConnected()
          && !mPlusClient.isConnecting()) {
        mPlusClient.connect();
      }
    }
  }

  @Override
  public void onAccessRevoked(ConnectionResult status) {
    if (status.isSuccess()) {
      mConnected = false;
      updateUI();
    } else {
        mPlusClient.disconnect();
    }
    mPlusClient.connect();
  }

  @Override
  public void onConnected(Bundle bundle) {
    mConnected = true;
    Person me = mPlusClient.getCurrentPerson();
    mUserId = me.getId();
    mUserName = me.getDisplayName();
    mUserAccount = mPlusClient.getAccountName();
    updateAlbums();
    updateUI();
  }

  @Override
  public void onConnectionFailed(ConnectionResult result) {
    mConnectionResult = result;
    updateUI();
  }

  @Override
  public void onDisconnected() {
    mConnected = false;
    updateUI();
    mPlusClient.connect();
  }

  private void updateUI() {
    MenuItem item;
    if (mMenu != null) {
      item = mMenu.findItem(R.id.action_signout);
      if (item != null) item.setVisible(mConnected);
      item = mMenu.findItem(R.id.action_revoke);
      if (item != null) item.setVisible(mConnected);
    }
    if (mConnected && mUserName != null) {
      mUserInfo.setText("  " + mUserName);
      mUserInfo.setVisibility(View.VISIBLE);
    } else {
      mUserInfo.setVisibility(View.GONE);
    }
  
    mSignInButton.setVisibility(mConnected ? View.GONE : View.VISIBLE);
    mContent.setVisibility(mConnected ? View.VISIBLE : View.GONE);
  }

  private void updateAlbums() {
    if (!mConnected || mUserAccount == null) return;
  
    PicasaAlbumsTask search =
      new PicasaAlbumsTask(mReceiver,
                           this,
                           (String) mUserAccount,
                           (String) mUserId,
                           "oauth2:https://www.googleapis.com/auth/plus.login https://picasaweb.google.com/data/");
    search.execute();
  }
  
  private class SearchReceiver extends AsyncReceiver {
    @Override
    public void finished(int results) {
      if (results > 0) {
        // refresh();
      }
    }
  }
  
  private class MyMediaRouterCallback extends MediaRouter.Callback {
    @Override
    public void onRouteSelected(MediaRouter router, RouteInfo route) {
      MediaRouteHelper.requestCastDeviceForRoute(route);
    }

    @Override
    public void onRouteUnselected(MediaRouter router, RouteInfo route) {
      mSelectedDevice = null;
      mRouteStateListener = null;
    }
  }
  
  @Override
  public void onDeviceAvailable(CastDevice device, String routeId,
          MediaRouteStateChangeListener listener) {
      mSelectedDevice = device;
      mRouteStateListener = listener;
  }

  @Override
  public void onSetVolume(double volume) {
      // Handle volume change.
  }

  @Override
  public void onUpdateVolume(double delta) {
      // Handle volume change.
  }
}
