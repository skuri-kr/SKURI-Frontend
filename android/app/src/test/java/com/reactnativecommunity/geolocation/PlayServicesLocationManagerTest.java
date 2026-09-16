package com.reactnativecommunity.geolocation;

import static org.junit.Assert.assertThrows;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import android.location.Location;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.WritableMap;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationResult;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.mockito.InOrder;
import org.mockito.MockedStatic;
import org.objenesis.ObjenesisStd;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Collections;

public class PlayServicesLocationManagerTest {
    private MockedStatic<Arguments> arguments;
    private FusedLocationProviderClient fusedLocationClient;
    private MockedStatic<Log> log;
    private PlayServicesLocationManager manager;

    @Before
    public void setUp() throws Exception {
        arguments = mockStatic(Arguments.class);
        arguments.when(Arguments::createMap).thenReturn(mock(WritableMap.class));
        log = mockStatic(Log.class);

        manager = new ObjenesisStd().newInstance(PlayServicesLocationManager.class);
        fusedLocationClient = mock(FusedLocationProviderClient.class);
        setField(manager, "mFusedLocationClient", fusedLocationClient);
    }

    @After
    public void tearDown() {
        log.close();
        arguments.close();
    }

    @Test
    public void callbacksRemoveThemselvesWhenFirstRequestCompletesFirst() throws Exception {
        LocationCallback first = createSingleLocationCallback();
        LocationCallback second = createSingleLocationCallback();

        first.onLocationResult(locationResult());
        second.onLocationResult(locationResult());

        InOrder order = inOrder(fusedLocationClient);
        order.verify(fusedLocationClient).removeLocationUpdates(first);
        order.verify(fusedLocationClient).removeLocationUpdates(second);
        verifyNoNullCallbackWasRemoved();
    }

    @Test
    public void callbacksRemoveThemselvesWhenSecondRequestCompletesFirst() throws Exception {
        LocationCallback first = createSingleLocationCallback();
        LocationCallback second = createSingleLocationCallback();

        second.onLocationResult(locationResult());
        first.onLocationResult(locationResult());

        InOrder order = inOrder(fusedLocationClient);
        order.verify(fusedLocationClient).removeLocationUpdates(second);
        order.verify(fusedLocationClient).removeLocationUpdates(first);
        verifyNoNullCallbackWasRemoved();
    }

    @Test
    public void lateRepeatedResultStillRemovesTheSameCallback() throws Exception {
        LocationCallback callback = createSingleLocationCallback();

        callback.onLocationResult(locationResult());
        callback.onLocationResult(locationResult());

        verify(fusedLocationClient, times(2)).removeLocationUpdates(callback);
        verifyNoNullCallbackWasRemoved();
    }

    @Test
    public void legacySharedSingleLocationCallbackFieldIsAbsent() {
        assertThrows(
            NoSuchFieldException.class,
            () -> PlayServicesLocationManager.class.getDeclaredField("mSingleLocationCallback")
        );
    }

    private LocationCallback createSingleLocationCallback() throws Exception {
        Method method = PlayServicesLocationManager.class.getDeclaredMethod(
            "createSingleLocationCallback",
            Callback.class,
            Callback.class
        );
        method.setAccessible(true);

        return (LocationCallback) method.invoke(
            manager,
            mock(Callback.class),
            mock(Callback.class)
        );
    }

    private LocationResult locationResult() {
        return LocationResult.create(Collections.singletonList(mock(Location.class)));
    }

    private void verifyNoNullCallbackWasRemoved() {
        verify(fusedLocationClient, never())
            .removeLocationUpdates(isNull(LocationCallback.class));
    }

    private static void setField(Object target, String name, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(name);
        field.setAccessible(true);
        field.set(target, value);
    }
}
